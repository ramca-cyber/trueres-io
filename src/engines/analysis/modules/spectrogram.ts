import { fft, magnitudeSpectrum } from './fft';
import { getWindow } from './windowing';
import { type SpectrogramData } from '@/types/analysis';

/**
 * Compute spectrogram: 2D array of dB magnitudes [time × frequency]
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
  const numFrames = Math.floor((channelData.length - fftSize) / hopSize) + 1;

  const magnitudes: Float32Array[] = [];
  const frequencies = new Float32Array(halfFFT);
  const times = new Float32Array(numFrames);

  // Frequency bins
  for (let i = 0; i < halfFFT; i++) {
    frequencies[i] = (i * sampleRate) / fftSize;
  }

  // Process each frame
  for (let frame = 0; frame < numFrames; frame++) {
    const offset = frame * hopSize;
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

  return { magnitudes, frequencies, times, fftSize, hopSize, sampleRate };
}
