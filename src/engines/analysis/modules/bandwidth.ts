import { fft, powerSpectrum } from './fft';
import { hann } from './windowing';
import { type BandwidthResult } from '@/types/analysis';

/**
 * Detect the effective frequency bandwidth / ceiling of audio
 * Used to detect upsampled content (e.g. 44.1kHz content in a 96kHz file)
 */
export function analyzeBandwidth(
  channelData: Float32Array[],
  sampleRate: number,
  fftSize: number = 8192
): BandwidthResult {
  const start = performance.now();
  const nyquist = sampleRate / 2;
  const window = hann(fftSize);

  // Average spectrum across multiple frames
  const halfFFT = fftSize >> 1;
  const avgPower = new Float64Array(halfFFT);
  let frameCount = 0;

  // Mix to mono if stereo
  const mono = channelData.length > 1
    ? mixToMono(channelData)
    : channelData[0];

  const hopSize = fftSize;
  const numFrames = Math.floor(mono.length / hopSize);
  const maxFrames = Math.min(numFrames, 200);
  const frameStep = Math.max(1, Math.floor(numFrames / maxFrames));

  for (let f = 0; f < numFrames; f += frameStep) {
    const offset = f * hopSize;
    if (offset + fftSize > mono.length) break;

    const real = new Float64Array(fftSize);
    const imag = new Float64Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      real[i] = mono[offset + i] * window[i];
    }

    fft(real, imag);
    const power = powerSpectrum(real, imag);

    for (let i = 0; i < halfFFT; i++) {
      avgPower[i] += power[i];
    }
    frameCount++;
  }

  if (frameCount > 0) {
    for (let i = 0; i < halfFFT; i++) {
      avgPower[i] /= frameCount;
    }
  }

  // Convert to dB
  const avgDb = new Float64Array(halfFFT);
  for (let i = 0; i < halfFFT; i++) {
    avgDb[i] = avgPower[i] > 0 ? 10 * Math.log10(avgPower[i]) : -160;
  }

  // Find noise floor (median of bottom 10% of spectrum)
  const sorted = Array.from(avgDb).sort((a, b) => a - b);
  const noiseFloor = sorted[Math.floor(sorted.length * 0.1)];

  // Adaptive ceiling detection:
  // Instead of a fixed 10dB threshold, look for the spectral cliff —
  // a sharp drop in energy over a narrow frequency range.
  const smoothWindow = 8; // bins to smooth over
  const smoothDb = new Float64Array(halfFFT);
  for (let i = 0; i < halfFFT; i++) {
    let sum = 0, count = 0;
    for (let j = Math.max(0, i - smoothWindow); j <= Math.min(halfFFT - 1, i + smoothWindow); j++) {
      sum += avgDb[j];
      count++;
    }
    smoothDb[i] = sum / count;
  }

  // Find ceiling: scan from top, look for where smoothed energy drops
  // sharply (cliff) OR falls below noise floor + 6dB (gentle rolloff)
  const cliffThreshold = 15; // dB drop over cliffWindow bins = brick-wall cutoff
  const cliffWindow = 10;
  const gentleThreshold = noiseFloor + 6;

  let ceilingBin = halfFFT - 1;
  let cutoffType: 'cliff' | 'gradual' = 'gradual';

  // First pass: look for a spectral cliff (sharp cutoff = lossy encoding)
  for (let i = halfFFT - cliffWindow - 1; i >= cliffWindow; i--) {
    const drop = smoothDb[i] - smoothDb[i + cliffWindow];
    if (drop > cliffThreshold && smoothDb[i] > noiseFloor + 15) {
      ceilingBin = i + Math.floor(cliffWindow / 2);
      cutoffType = 'cliff';
      break;
    }
  }

  // If no cliff found, use the gentle threshold approach
  if (cutoffType === 'gradual') {
    for (let i = halfFFT - 1; i >= 0; i--) {
      if (smoothDb[i] > gentleThreshold) {
        ceilingBin = i;
        break;
      }
    }
  }

  const frequencyCeiling = (ceilingBin / halfFFT) * nyquist;

  // Cutoff sharpness: measure dB/octave drop rate at the ceiling
  const windowSize = Math.min(20, halfFFT - ceilingBin);
  let dropRate = 0;
  if (windowSize > 2) {
    const before = smoothDb[Math.max(0, ceilingBin - windowSize)];
    const after = smoothDb[Math.min(halfFFT - 1, ceilingBin + windowSize)];
    dropRate = before - after;
  }

  // Source guess: combine ceiling frequency + cutoff type for better accuracy
  let sourceGuess = 'Unknown';
  let isUpsampled = false;

  if (cutoffType === 'cliff') {
    // Sharp cutoff strongly indicates lossy encoding
    if (frequencyCeiling < 16500) {
      sourceGuess = 'MP3/AAC (≤128kbps)';
      isUpsampled = true;
    } else if (frequencyCeiling < 18000) {
      sourceGuess = 'Lossy (likely MP3/OGG ≤192kbps)';
      isUpsampled = true;
    } else if (frequencyCeiling < 20500) {
      sourceGuess = 'Lossy (high-bitrate MP3/AAC)';
      isUpsampled = sampleRate > 48000;
    } else if (frequencyCeiling < 24000 && sampleRate > 48000) {
      sourceGuess = 'Likely 48kHz source (brick-wall at ceiling)';
      isUpsampled = true;
    } else {
      sourceGuess = 'High-resolution content';
      isUpsampled = false;
    }
  } else {
    // Gradual rolloff — more likely genuine content
    if (frequencyCeiling < 16000 && sampleRate >= 44100) {
      sourceGuess = 'Likely lossy source (low bandwidth)';
      isUpsampled = true;
    } else if (frequencyCeiling < 20000 && sampleRate > 48000) {
      sourceGuess = 'CD-quality content (gradual rolloff)';
      isUpsampled = true;
    } else {
      sourceGuess = 'Genuine high-resolution content';
      isUpsampled = false;
    }
  }

  const confidence = Math.min(100, Math.round(frameCount / 2 * 10));

  return {
    type: 'bandwidth',
    timestamp: Date.now(),
    duration: performance.now() - start,
    frequencyCeiling,
    cutoffSharpness: dropRate,
    sourceGuess,
    isUpsampled,
    confidence,
  };
}

function mixToMono(channels: Float32Array[]): Float32Array {
  const length = channels[0].length;
  const mono = new Float32Array(length);
  const numCh = channels.length;
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let ch = 0; ch < numCh; ch++) {
      sum += channels[ch][i];
    }
    mono[i] = sum / numCh;
  }
  return mono;
}
