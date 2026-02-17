import { fft, magnitudeSpectrum } from './fft';
import { hann } from './windowing';
import { type SpectrumData } from '@/types/analysis';

/**
 * Compute average frequency spectrum
 */
export function computeSpectrum(
  channelData: Float32Array[],
  sampleRate: number,
  fftSize: number = 8192
): SpectrumData {
  const halfFFT = fftSize >> 1;
  const window = hann(fftSize);

  const mono = channelData.length > 1 ? mixToMono(channelData) : channelData[0];

  const avgMag = new Float64Array(halfFFT);
  let frameCount = 0;
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
    const mags = magnitudeSpectrum(real, imag);

    for (let i = 0; i < halfFFT; i++) {
      avgMag[i] += mags[i];
    }
    frameCount++;
  }

  const magnitudes = new Float32Array(halfFFT);
  const frequencies = new Float32Array(halfFFT);
  for (let i = 0; i < halfFFT; i++) {
    magnitudes[i] = frameCount > 0 ? avgMag[i] / frameCount : -160;
    frequencies[i] = (i * sampleRate) / fftSize;
  }

  // 1/3 octave bands
  const octaveBands = computeOctaveBands(magnitudes, frequencies);

  return { magnitudes, frequencies, octaveBands };
}

function computeOctaveBands(
  magnitudes: Float32Array,
  frequencies: Float32Array
): { center: number; magnitude: number }[] {
  const bands: { center: number; magnitude: number }[] = [];
  const centerFreqs = [
    20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500,
    630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000,
    10000, 12500, 16000, 20000,
  ];

  for (const center of centerFreqs) {
    const lower = center / Math.pow(2, 1 / 6);
    const upper = center * Math.pow(2, 1 / 6);

    let sum = 0;
    let count = 0;
    for (let i = 0; i < frequencies.length; i++) {
      if (frequencies[i] >= lower && frequencies[i] <= upper) {
        // Convert from dB to linear, average, convert back
        sum += Math.pow(10, magnitudes[i] / 20);
        count++;
      }
    }

    if (count > 0) {
      bands.push({ center, magnitude: 20 * Math.log10(sum / count) });
    }
  }

  return bands;
}

function mixToMono(channels: Float32Array[]): Float32Array {
  const length = channels[0].length;
  const mono = new Float32Array(length);
  const n = channels.length;
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let ch = 0; ch < n; ch++) sum += channels[ch][i];
    mono[i] = sum / n;
  }
  return mono;
}
