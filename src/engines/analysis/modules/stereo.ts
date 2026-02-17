import { type StereoResult } from '@/types/analysis';

/**
 * Analyze stereo field: correlation, width, mid/side energy
 */
export function analyzeStereo(channelData: Float32Array[]): StereoResult {
  const start = performance.now();

  if (channelData.length < 2) {
    return {
      type: 'stereo', timestamp: Date.now(), duration: 0,
      correlation: 1, stereoWidth: 0, midEnergy: 1, sideEnergy: 0, monoCompatibilityLoss: 0,
    };
  }

  const left = channelData[0];
  const right = channelData[1];
  const length = Math.min(left.length, right.length);

  let sumLR = 0, sumLL = 0, sumRR = 0;
  let midEnergy = 0, sideEnergy = 0;
  let monoEnergy = 0, stereoEnergy = 0;

  // Sample for performance (max 5M samples)
  const step = Math.max(1, Math.floor(length / 5_000_000));

  let count = 0;
  for (let i = 0; i < length; i += step) {
    const l = left[i];
    const r = right[i];

    sumLR += l * r;
    sumLL += l * l;
    sumRR += r * r;

    const mid = (l + r) * 0.5;
    const side = (l - r) * 0.5;
    midEnergy += mid * mid;
    sideEnergy += side * side;

    monoEnergy += mid * mid;
    stereoEnergy += l * l + r * r;

    count++;
  }

  // Pearson correlation coefficient
  const denom = Math.sqrt(sumLL * sumRR);
  const correlation = denom > 0 ? sumLR / denom : 0;

  // Stereo width (0 = mono, 1 = full stereo, >1 = out of phase)
  const totalEnergy = midEnergy + sideEnergy;
  const stereoWidth = totalEnergy > 0 ? sideEnergy / totalEnergy : 0;

  // Normalize energies
  const midNorm = totalEnergy > 0 ? midEnergy / totalEnergy : 1;
  const sideNorm = totalEnergy > 0 ? sideEnergy / totalEnergy : 0;

  // Mono compatibility loss: how much energy is lost when summing to mono
  const monoLoss = stereoEnergy > 0
    ? Math.max(0, 1 - (monoEnergy * 2) / stereoEnergy) * 100
    : 0;

  return {
    type: 'stereo',
    timestamp: Date.now(),
    duration: performance.now() - start,
    correlation,
    stereoWidth,
    midEnergy: midNorm,
    sideEnergy: sideNorm,
    monoCompatibilityLoss: monoLoss,
  };
}
