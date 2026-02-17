/**
 * Generate a tone buffer
 */
export function generateTone(
  frequency: number,
  duration: number,
  sampleRate: number = 44100,
  waveform: 'sine' | 'square' | 'triangle' | 'sawtooth' = 'sine',
  amplitude: number = 0.8
): Float32Array {
  const length = Math.round(sampleRate * duration);
  const buffer = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const phase = (frequency * t) % 1;

    switch (waveform) {
      case 'sine':
        buffer[i] = amplitude * Math.sin(2 * Math.PI * frequency * t);
        break;
      case 'square':
        buffer[i] = amplitude * (phase < 0.5 ? 1 : -1);
        break;
      case 'triangle':
        buffer[i] = amplitude * (4 * Math.abs(phase - 0.5) - 1);
        break;
      case 'sawtooth':
        buffer[i] = amplitude * (2 * phase - 1);
        break;
    }
  }

  return buffer;
}
