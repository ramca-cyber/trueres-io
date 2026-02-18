import { type LUFSResult } from '@/types/analysis';

/**
 * ITU-R BS.1770-4 LUFS measurement
 * Implements K-weighting filter + gated loudness
 */
export function measureLUFS(
  channelData: Float32Array[],
  sampleRate: number
): LUFSResult {
  const start = performance.now();
  const numChannels = channelData.length;
  const length = channelData[0].length;

  // Step 1: K-weighting filter (pre-filter + RLB weighting)
  const filtered: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    const stage1 = applyBiquad(channelData[ch], sampleRate, 'highshelf');
    const stage2 = applyBiquad(stage1, sampleRate, 'highpass');
    filtered.push(stage2);
  }

  // Channel weights (ITU-R BS.1770)
  const weights = numChannels <= 2
    ? new Array(numChannels).fill(1.0)
    : [1.0, 1.0, 1.0, 1.41, 1.41]; // L, R, C, Ls, Rs

  // Step 2: Mean square per block (400ms blocks, 75% overlap)
  const blockSamples = Math.round(sampleRate * 0.4);
  const hopSamples = Math.round(blockSamples * 0.25);
  const numBlocks = Math.floor((length - blockSamples) / hopSamples) + 1;

  const blockLoudness = new Float64Array(numBlocks);

  for (let b = 0; b < numBlocks; b++) {
    const offset = b * hopSamples;
    let sum = 0;

    for (let ch = 0; ch < numChannels; ch++) {
      const w = weights[ch] || 1.0;
      let chSum = 0;
      for (let i = 0; i < blockSamples; i++) {
        const s = filtered[ch][offset + i] || 0;
        chSum += s * s;
      }
      sum += w * (chSum / blockSamples);
    }

    blockLoudness[b] = sum;
  }

  // Step 3: Absolute gate (-70 LUFS)
  const absoluteThreshold = Math.pow(10, (-70 + 0.691) / 10);
  let gatedSum = 0;
  let gatedCount = 0;

  for (let b = 0; b < numBlocks; b++) {
    if (blockLoudness[b] > absoluteThreshold) {
      gatedSum += blockLoudness[b];
      gatedCount++;
    }
  }

  const absoluteGatedLoudness = gatedCount > 0 ? gatedSum / gatedCount : 0;

  // Step 4: Relative gate (-10 dB relative to absolute gated)
  const relativeThreshold = absoluteGatedLoudness * Math.pow(10, -1); // -10 dB
  let finalSum = 0;
  let finalCount = 0;

  for (let b = 0; b < numBlocks; b++) {
    if (blockLoudness[b] > relativeThreshold && blockLoudness[b] > absoluteThreshold) {
      finalSum += blockLoudness[b];
      finalCount++;
    }
  }

  const integrated = finalCount > 0
    ? -0.691 + 10 * Math.log10(finalSum / finalCount)
    : -Infinity;

  // Short-term (3s window)
  const shortTermSamples = Math.round(sampleRate * 3);
  const shortTermHop = Math.round(sampleRate * 1);
  const numShortTerm = Math.floor((length - shortTermSamples) / shortTermHop) + 1;
  const shortTerm: number[] = [];

  for (let st = 0; st < numShortTerm; st++) {
    const offset = st * shortTermHop;
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const w = weights[ch] || 1.0;
      let chSum = 0;
      for (let i = 0; i < shortTermSamples; i++) {
        const s = filtered[ch][offset + i] || 0;
        chSum += s * s;
      }
      sum += w * (chSum / shortTermSamples);
    }
    shortTerm.push(sum > 0 ? -0.691 + 10 * Math.log10(sum) : -Infinity);
  }

  // Momentary (400ms)
  const momentary: number[] = [];
  for (let b = 0; b < numBlocks; b++) {
    momentary.push(
      blockLoudness[b] > 0
        ? -0.691 + 10 * Math.log10(blockLoudness[b])
        : -Infinity
    );
  }

  // Sample peak (per-sample max, not ITU-R BS.1770 true peak which requires 4x oversampling)
  let truePeak = 0;
  for (let ch = 0; ch < numChannels; ch++) {
    for (let i = 0; i < channelData[ch].length; i++) {
      const abs = Math.abs(channelData[ch][i]);
      if (abs > truePeak) truePeak = abs;
    }
  }
  const truePeakDb = truePeak > 0 ? 20 * Math.log10(truePeak) : -Infinity;

  // LRA (Loudness Range)
  const validShortTerm = shortTerm.filter((v) => isFinite(v) && v > -70);
  validShortTerm.sort((a, b) => a - b);
  const lra = validShortTerm.length >= 2
    ? validShortTerm[Math.floor(validShortTerm.length * 0.95)] -
      validShortTerm[Math.floor(validShortTerm.length * 0.1)]
    : 0;

  return {
    type: 'lufs',
    timestamp: Date.now(),
    duration: performance.now() - start,
    integrated,
    shortTerm,
    momentary,
    truePeak: truePeakDb,
    lra,
  };
}

/**
 * Simplified biquad filter for K-weighting
 */
function applyBiquad(
  input: Float32Array,
  sampleRate: number,
  type: 'highshelf' | 'highpass'
): Float32Array {
  const output = new Float32Array(input.length);

  // Pre-computed coefficients for common sample rates (simplified)
  let b0: number, b1: number, b2: number, a1: number, a2: number;

  if (type === 'highshelf') {
    // +4dB shelf at 1500Hz (K-weighting stage 1)
    const fc = 1681.974450955533;
    const G = 3.999843853973347;
    const Q = 0.7071752369554196;
    const K = Math.tan(Math.PI * fc / sampleRate);
    const Vh = Math.pow(10, G / 20);
    const Vb = Math.pow(Vh, 0.4996667741545416);
    const a0_ = 1 + K / Q + K * K;
    b0 = (Vh + Vb * K / Q + K * K) / a0_;
    b1 = 2 * (K * K - Vh) / a0_;
    b2 = (Vh - Vb * K / Q + K * K) / a0_;
    a1 = 2 * (K * K - 1) / a0_;
    a2 = (1 - K / Q + K * K) / a0_;
  } else {
    // Highpass at 38Hz (K-weighting stage 2, RLB)
    const fc = 38.13547087602444;
    const Q = 0.5003270373238773;
    const K = Math.tan(Math.PI * fc / sampleRate);
    const a0_ = 1 + K / Q + K * K;
    b0 = 1 / a0_;
    b1 = -2 / a0_;
    b2 = 1 / a0_;
    a1 = 2 * (K * K - 1) / a0_;
    a2 = (1 - K / Q + K * K) / a0_;
  }

  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x = input[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x;
    y2 = y1; y1 = y;
    output[i] = y;
  }

  return output;
}
