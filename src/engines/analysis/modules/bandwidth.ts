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

  // Find noise floor (median of bottom 20% of spectrum)
  const sorted = Array.from(avgDb).sort((a, b) => a - b);
  const noiseFloor = sorted[Math.floor(sorted.length * 0.1)];

  // Find frequency ceiling: highest frequency significantly above noise floor
  const threshold = noiseFloor + 10; // 10dB above noise floor
  let ceilingBin = halfFFT - 1;
  for (let i = halfFFT - 1; i >= 0; i--) {
    if (avgDb[i] > threshold) {
      ceilingBin = i;
      break;
    }
  }

  const frequencyCeiling = (ceilingBin / halfFFT) * nyquist;

  // Cutoff sharpness: how fast does signal drop at the ceiling?
  const windowSize = Math.min(20, halfFFT - ceilingBin);
  let dropRate = 0;
  if (windowSize > 2) {
    const before = avgDb[Math.max(0, ceilingBin - windowSize)];
    const after = avgDb[Math.min(halfFFT - 1, ceilingBin + windowSize)];
    dropRate = before - after;
  }

  // Guess source based on ceiling
  let sourceGuess = 'Unknown';
  let isUpsampled = false;

  if (frequencyCeiling < 16500 && sampleRate >= 44100) {
    sourceGuess = 'MP3/AAC (≤128kbps)';
    isUpsampled = true;
  } else if (frequencyCeiling < 18000 && sampleRate >= 44100) {
    sourceGuess = 'Lossy (likely MP3/OGG ≤192kbps)';
    isUpsampled = true;
  } else if (frequencyCeiling < 20500 && sampleRate >= 44100) {
    sourceGuess = 'CD-quality or high-bitrate lossy';
    isUpsampled = sampleRate > 48000;
  } else if (frequencyCeiling < 24000 && sampleRate > 48000) {
    sourceGuess = 'Likely 48kHz source';
    isUpsampled = sampleRate > 48000;
  } else {
    sourceGuess = 'Genuine high-resolution content';
    isUpsampled = false;
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
