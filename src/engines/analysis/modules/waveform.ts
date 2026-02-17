import { type WaveformData } from '@/types/analysis';

/**
 * Compute multi-resolution waveform envelope (peak + RMS)
 */
export function computeWaveform(
  channelData: Float32Array,
  targetWidth: number = 2000
): WaveformData {
  const length = channelData.length;
  const samplesPerPixel = Math.max(1, Math.floor(length / targetWidth));
  const numBuckets = Math.ceil(length / samplesPerPixel);

  const peaks = new Float32Array(numBuckets);
  const rms = new Float32Array(numBuckets);

  for (let b = 0; b < numBuckets; b++) {
    const start = b * samplesPerPixel;
    const end = Math.min(start + samplesPerPixel, length);
    let peak = 0;
    let sumSq = 0;
    let count = 0;

    for (let i = start; i < end; i++) {
      const abs = Math.abs(channelData[i]);
      if (abs > peak) peak = abs;
      sumSq += channelData[i] * channelData[i];
      count++;
    }

    peaks[b] = peak;
    rms[b] = count > 0 ? Math.sqrt(sumSq / count) : 0;
  }

  return { peaks, rms, samplesPerPixel };
}
