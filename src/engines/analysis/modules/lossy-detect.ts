import { fft, powerSpectrum } from './fft';
import { hann } from './windowing';
import { type LossyDetectResult } from '@/types/analysis';

/**
 * Detect if a lossless file was transcoded from a lossy source
 * by looking for spectral holes and encoder fingerprints
 */
export function detectLossy(
  channelData: Float32Array[],
  sampleRate: number,
  fftSize: number = 8192
): LossyDetectResult {
  const start = performance.now();
  const halfFFT = fftSize >> 1;
  const window = hann(fftSize);

  const mono = channelData.length > 1 ? mixToMono(channelData) : channelData[0];

  // Compute average spectrum
  const avgPower = new Float64Array(halfFFT);
  let frameCount = 0;
  const hopSize = fftSize;
  const numFrames = Math.floor(mono.length / hopSize);
  const maxFrames = Math.min(numFrames, 150);
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

  for (let i = 0; i < halfFFT; i++) {
    avgPower[i] = frameCount > 0 ? avgPower[i] / frameCount : 0;
  }

  // Convert to dB
  const dbSpectrum = new Float64Array(halfFFT);
  for (let i = 0; i < halfFFT; i++) {
    dbSpectrum[i] = avgPower[i] > 0 ? 10 * Math.log10(avgPower[i]) : -160;
  }

  // Detect spectral holes: bins with abnormally low energy surrounded by higher energy
  let spectralHoles = 0;
  const holeThreshold = 20; // dB drop

  // Check subbands (MP3 uses 32 subbands of ~689Hz at 44.1kHz)
  const subbandWidth = Math.round(halfFFT / 32);
  for (let band = 1; band < 31; band++) {
    const bandStart = band * subbandWidth;
    const bandEnd = Math.min((band + 1) * subbandWidth, halfFFT);

    let bandAvg = 0;
    for (let i = bandStart; i < bandEnd; i++) {
      bandAvg += dbSpectrum[i];
    }
    bandAvg /= (bandEnd - bandStart);

    // Compare with neighbors
    const prevBandAvg = getSubbandAvg(dbSpectrum, (band - 1) * subbandWidth, subbandWidth);
    const nextBandAvg = getSubbandAvg(dbSpectrum, (band + 1) * subbandWidth, subbandWidth);
    const neighborAvg = (prevBandAvg + nextBandAvg) / 2;

    if (neighborAvg - bandAvg > holeThreshold) {
      spectralHoles++;
    }
  }

  // Detect encoder fingerprint
  let encoderFingerprint: string | null = null;

  // MP3 typically has a sharp cutoff at specific frequencies
  const nyquist = sampleRate / 2;
  const cutoffFreqs = [16000, 16500, 17000, 18000, 19000, 20000];
  for (const freq of cutoffFreqs) {
    if (freq >= nyquist) continue;
    const bin = Math.round((freq / nyquist) * halfFFT);
    if (bin + 5 < halfFFT) {
      const belowCutoff = dbSpectrum[bin - 5];
      const aboveCutoff = dbSpectrum[bin + 5];
      if (belowCutoff - aboveCutoff > 30) {
        encoderFingerprint = `Sharp cutoff at ~${freq}Hz (likely MP3)`;
        break;
      }
    }
  }

  const isLossy = spectralHoles > 5 || encoderFingerprint !== null;
  const confidence = Math.min(100, Math.round(
    (spectralHoles * 15) + (encoderFingerprint ? 40 : 0) + (frameCount > 50 ? 20 : frameCount * 0.4)
  ));

  return {
    type: 'lossyDetect',
    timestamp: Date.now(),
    duration: performance.now() - start,
    isLossy,
    spectralHoles,
    encoderFingerprint,
    confidence: Math.min(confidence, 100),
  };
}

function getSubbandAvg(db: Float64Array, start: number, width: number): number {
  const end = Math.min(start + width, db.length);
  let sum = 0;
  for (let i = Math.max(0, start); i < end; i++) {
    sum += db[i];
  }
  return sum / Math.max(1, end - Math.max(0, start));
}

function mixToMono(channels: Float32Array[]): Float32Array {
  const length = channels[0].length;
  const mono = new Float32Array(length);
  const numCh = channels.length;
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let ch = 0; ch < numCh; ch++) sum += channels[ch][i];
    mono[i] = sum / numCh;
  }
  return mono;
}
