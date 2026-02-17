/**
 * Window functions for FFT analysis
 */

export function hann(N: number): Float64Array {
  const w = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
  }
  return w;
}

export function hamming(N: number): Float64Array {
  const w = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    w[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (N - 1));
  }
  return w;
}

export function blackman(N: number): Float64Array {
  const w = new Float64Array(N);
  const a0 = 0.42, a1 = 0.5, a2 = 0.08;
  for (let i = 0; i < N; i++) {
    const x = (2 * Math.PI * i) / (N - 1);
    w[i] = a0 - a1 * Math.cos(x) + a2 * Math.cos(2 * x);
  }
  return w;
}

export function blackmanHarris(N: number): Float64Array {
  const w = new Float64Array(N);
  const a0 = 0.35875, a1 = 0.48829, a2 = 0.14128, a3 = 0.01168;
  for (let i = 0; i < N; i++) {
    const x = (2 * Math.PI * i) / (N - 1);
    w[i] = a0 - a1 * Math.cos(x) + a2 * Math.cos(2 * x) - a3 * Math.cos(3 * x);
  }
  return w;
}

export function kaiser(N: number, beta: number = 12): Float64Array {
  const w = new Float64Array(N);
  const denom = bessel0(beta);
  for (let i = 0; i < N; i++) {
    const x = 2 * i / (N - 1) - 1;
    w[i] = bessel0(beta * Math.sqrt(1 - x * x)) / denom;
  }
  return w;
}

export function flatTop(N: number): Float64Array {
  const w = new Float64Array(N);
  const a0 = 0.21557895, a1 = 0.41663158, a2 = 0.277263158, a3 = 0.083578947, a4 = 0.006947368;
  for (let i = 0; i < N; i++) {
    const x = (2 * Math.PI * i) / (N - 1);
    w[i] = a0 - a1 * Math.cos(x) + a2 * Math.cos(2 * x) - a3 * Math.cos(3 * x) + a4 * Math.cos(4 * x);
  }
  return w;
}

/**
 * Get window function by name
 */
export function getWindow(name: string, N: number): Float64Array {
  switch (name) {
    case 'hann': return hann(N);
    case 'hamming': return hamming(N);
    case 'blackman': return blackman(N);
    case 'blackman-harris': return blackmanHarris(N);
    case 'kaiser': return kaiser(N);
    case 'flat-top': return flatTop(N);
    default: return hann(N);
  }
}

/**
 * Modified Bessel function of the first kind, order 0
 */
function bessel0(x: number): number {
  let sum = 1;
  let term = 1;
  for (let k = 1; k < 25; k++) {
    term *= (x / (2 * k)) * (x / (2 * k));
    sum += term;
    if (term < 1e-12) break;
  }
  return sum;
}
