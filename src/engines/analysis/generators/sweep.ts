/**
 * Generate a frequency sweep
 */
export function generateSweep(
  startFreq: number,
  endFreq: number,
  duration: number,
  sampleRate: number = 44100,
  type: 'linear' | 'logarithmic' = 'logarithmic',
  amplitude: number = 0.8
): Float32Array {
  const length = Math.round(sampleRate * duration);
  const buffer = new Float32Array(length);

  if (type === 'logarithmic') {
    const k = Math.log(endFreq / startFreq) / duration;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const phase = (startFreq / k) * (Math.exp(k * t) - 1);
      buffer[i] = amplitude * Math.sin(2 * Math.PI * phase);
    }
  } else {
    const freqRate = (endFreq - startFreq) / duration;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const freq = startFreq + freqRate * t;
      const phase = startFreq * t + (freqRate * t * t) / 2;
      buffer[i] = amplitude * Math.sin(2 * Math.PI * phase);
    }
  }

  return buffer;
}
