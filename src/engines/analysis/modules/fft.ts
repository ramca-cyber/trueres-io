/**
 * Cooley-Tukey radix-2 FFT (in-place)
 * Input: real/imag arrays of length N (must be power of 2)
 */
export function fft(real: Float64Array, imag: Float64Array): void {
  const N = real.length;
  if (N <= 1) return;

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < N - 1; i++) {
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
    let k = N >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Butterfly computation
  for (let len = 2; len <= N; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;

    for (let i = 0; i < N; i += len) {
      for (let k = 0; k < halfLen; k++) {
        const theta = angle * k;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        const evenIdx = i + k;
        const oddIdx = i + k + halfLen;

        const tReal = cos * real[oddIdx] - sin * imag[oddIdx];
        const tImag = sin * real[oddIdx] + cos * imag[oddIdx];

        real[oddIdx] = real[evenIdx] - tReal;
        imag[oddIdx] = imag[evenIdx] - tImag;
        real[evenIdx] += tReal;
        imag[evenIdx] += tImag;
      }
    }
  }
}

/**
 * Compute magnitude spectrum in dB from FFT result
 */
export function magnitudeSpectrum(real: Float64Array, imag: Float64Array): Float64Array {
  const N = real.length;
  const halfN = N >> 1;
  const magnitudes = new Float64Array(halfN);

  for (let i = 0; i < halfN; i++) {
    const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / N;
    magnitudes[i] = mag > 0 ? 20 * Math.log10(mag) : -160;
  }

  return magnitudes;
}

/**
 * Compute power spectrum from FFT result
 */
export function powerSpectrum(real: Float64Array, imag: Float64Array): Float64Array {
  const N = real.length;
  const halfN = N >> 1;
  const power = new Float64Array(halfN);

  for (let i = 0; i < halfN; i++) {
    power[i] = (real[i] * real[i] + imag[i] * imag[i]) / (N * N);
  }

  return power;
}

/**
 * Next power of 2
 */
export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}
