import { type BitDepthResult } from '@/types/analysis';

/**
 * Analyze effective bit depth of PCM data
 * Checks LSB patterns to detect if audio has been upsampled from lower bit depth
 */
export function analyzeBitDepth(
  channelData: Float32Array[],
  reportedBitDepth: number
): BitDepthResult {
  const start = performance.now();
  const totalSamples = channelData.reduce((sum, ch) => sum + ch.length, 0);

  // Sample a subset for performance (max 2M samples)
  const maxSamples = Math.min(2_000_000, totalSamples);
  const step = Math.max(1, Math.floor(totalSamples / maxSamples));

  // Convert to integer representation and check LSB patterns
  const maxBit = Math.min(reportedBitDepth || 32, 32);
  const scale = Math.pow(2, maxBit - 1);

  // Count zero LSBs at each bit position
  const bitZeroCounts = new Array(maxBit).fill(0);
  let sampleCount = 0;

  for (const channel of channelData) {
    for (let i = 0; i < channel.length; i += step) {
      const intVal = Math.round(channel[i] * scale);
      for (let bit = 0; bit < maxBit; bit++) {
        if ((intVal & (1 << bit)) === 0) {
          bitZeroCounts[bit]++;
        }
      }
      sampleCount++;
    }
  }

  // Find effective bit depth by looking for all-zero LSBs
  let effectiveBitDepth = maxBit;
  let lsbZeroRatio = 0;

  for (let bit = 0; bit < maxBit; bit++) {
    const ratio = bitZeroCounts[bit] / sampleCount;
    if (ratio > 0.999) {
      // This bit is always zero — not used
      effectiveBitDepth = maxBit - bit - 1;
      lsbZeroRatio = ratio;
    } else {
      break;
    }
  }

  // If no bits were always zero, effective = reported
  if (effectiveBitDepth <= 0) effectiveBitDepth = maxBit;

  // Noise floor estimation (RMS of LSBs)
  let noiseSum = 0;
  for (const channel of channelData) {
    for (let i = 0; i < channel.length; i += step * 10) {
      noiseSum += channel[i] * channel[i];
    }
  }
  const noiseFloor = 20 * Math.log10(Math.sqrt(noiseSum / (sampleCount / 10)) || 1e-10);

  // Confidence based on sample count and consistency
  const confidence = Math.min(100, Math.round((sampleCount / 100000) * 100));

  return {
    type: 'bitDepth',
    timestamp: Date.now(),
    duration: performance.now() - start,
    effectiveBitDepth,
    reportedBitDepth: reportedBitDepth || maxBit,
    lsbZeroRatio,
    noiseFloor,
    confidence: Math.min(confidence, 100),
  };
}
