import { fft, magnitudeSpectrum } from './fft';
import { getWindow } from './windowing';
import { type SpectrogramData } from '@/types/analysis';

const MAX_FRAMES = 1200;

/**
 * Compute spectrogram: 2D array of dB magnitudes [time × frequency]
 * Automatically increases hop size to cap output at MAX_FRAMES columns,
 * preventing OOM on long / high-sample-rate files.
 */
export function computeSpectrogram(
  channelData: Float32Array,
  sampleRate: number,
  fftSize: number = 4096,
  hopSize: number = 1024,
  windowName: string = 'hann'
): SpectrogramData {
  const window = getWindow(windowName, fftSize);
  const halfFFT = fftSize >> 1;

  // Auto-increase hop size so we never exceed MAX_FRAMES
  let effectiveHop = hopSize;
  const rawFrames = Math.floor((channelData.length - fftSize) / effectiveHop) + 1;
  if (rawFrames > MAX_FRAMES) {
    effectiveHop = Math.ceil((channelData.length - fftSize) / (MAX_FRAMES - 1));
  }

  const numFrames = Math.floor((channelData.length - fftSize) / effectiveHop) + 1;

  const magnitudes: Float32Array[] = [];
  const frequencies = new Float32Array(halfFFT);
  const times = new Float32Array(numFrames);

  // Frequency bins
  for (let i = 0; i < halfFFT; i++) {
    frequencies[i] = (i * sampleRate) / fftSize;
  }

  // Process each frame
  for (let frame = 0; frame < numFrames; frame++) {
    const offset = frame * effectiveHop;
    times[frame] = offset / sampleRate;

    const real = new Float64Array(fftSize);
    const imag = new Float64Array(fftSize);

    // Apply window and copy
    for (let i = 0; i < fftSize; i++) {
      real[i] = (channelData[offset + i] || 0) * window[i];
    }

    fft(real, imag);
    const mags = magnitudeSpectrum(real, imag);

    // Convert to Float32 for memory efficiency
    const frame32 = new Float32Array(halfFFT);
    for (let i = 0; i < halfFFT; i++) {
      frame32[i] = mags[i];
    }
    magnitudes.push(frame32);
  }

  return { magnitudes, frequencies, times, fftSize, hopSize: effectiveHop, sampleRate };
}
