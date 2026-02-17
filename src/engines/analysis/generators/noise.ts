/**
 * Generate colored noise
 */
export function generateNoise(
  duration: number,
  sampleRate: number = 44100,
  type: 'white' | 'pink' | 'brown' | 'blue' | 'violet' | 'grey' = 'white',
  amplitude: number = 0.5
): Float32Array {
  const length = Math.round(sampleRate * duration);
  const buffer = new Float32Array(length);

  switch (type) {
    case 'white':
      for (let i = 0; i < length; i++) {
        buffer[i] = amplitude * (Math.random() * 2 - 1);
      }
      break;

    case 'pink': {
      // Voss-McCartney algorithm
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        buffer[i] = amplitude * (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
      break;
    }

    case 'brown': {
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + (0.02 * white)) / 1.02;
        buffer[i] = amplitude * last * 3.5;
      }
      break;
    }

    case 'blue': {
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        buffer[i] = amplitude * (white - last);
        last = white;
      }
      break;
    }

    case 'violet': {
      let last1 = 0, last2 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        buffer[i] = amplitude * (white - 2 * last1 + last2) * 0.5;
        last2 = last1;
        last1 = white;
      }
      break;
    }

    case 'grey': {
      // Approximation: A-weighted white noise
      for (let i = 0; i < length; i++) {
        buffer[i] = amplitude * (Math.random() * 2 - 1) * 0.7;
      }
      break;
    }
  }

  return buffer;
}
