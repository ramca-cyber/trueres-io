import { type VerdictResult, type BitDepthResult, type BandwidthResult, type LossyDetectResult, type DynamicRangeResult } from '@/types/analysis';

/**
 * Compute composite hi-res verdict score from sub-analyses
 */
export function computeVerdict(
  bitDepth: BitDepthResult | undefined,
  bandwidth: BandwidthResult | undefined,
  lossy: LossyDetectResult | undefined,
  dynamicRange: DynamicRangeResult | undefined,
  reportedBitDepth: number,
  reportedSampleRate: number
): VerdictResult {
  const start = performance.now();
  let score = 100;
  const issues: string[] = [];
  const positives: string[] = [];

  // Bit depth scoring (30 points)
  if (bitDepth) {
    if (bitDepth.effectiveBitDepth >= reportedBitDepth) {
      positives.push(`Genuine ${bitDepth.effectiveBitDepth}-bit content`);
    } else if (bitDepth.effectiveBitDepth >= 16 && reportedBitDepth > 16) {
      score -= 20;
      issues.push(`Effective bit depth is ${bitDepth.effectiveBitDepth}-bit (reported ${reportedBitDepth}-bit) — likely upsampled from CD quality`);
    } else if (bitDepth.effectiveBitDepth < 16) {
      score -= 30;
      issues.push(`Very low effective bit depth: ${bitDepth.effectiveBitDepth}-bit`);
    }
  }

  // Bandwidth scoring (30 points)
  if (bandwidth) {
    const nyquist = reportedSampleRate / 2;
    const usedBandwidth = bandwidth.frequencyCeiling / nyquist;

    if (bandwidth.isUpsampled) {
      score -= 25;
      issues.push(`${bandwidth.sourceGuess} — frequency content caps at ~${Math.round(bandwidth.frequencyCeiling / 1000)}kHz`);
    } else if (usedBandwidth > 0.85) {
      positives.push(`Full bandwidth utilization up to ~${Math.round(bandwidth.frequencyCeiling / 1000)}kHz`);
    } else {
      score -= 10;
      issues.push(`Limited bandwidth: content only up to ~${Math.round(bandwidth.frequencyCeiling / 1000)}kHz`);
    }
  }

  // Lossy detection scoring (25 points)
  if (lossy) {
    if (lossy.isLossy) {
      score -= 25;
      issues.push(`Lossy transcode detected: ${lossy.spectralHoles} spectral holes found${lossy.encoderFingerprint ? ` (${lossy.encoderFingerprint})` : ''}`);
    } else {
      positives.push('No lossy transcoding artifacts detected');
    }
  }

  // Dynamic range scoring (15 points)
  if (dynamicRange) {
    if (dynamicRange.drScore >= 10) {
      positives.push(`Excellent dynamic range: DR${dynamicRange.drScore}`);
    } else if (dynamicRange.drScore >= 6) {
      // Minor deduction
      score -= 5;
      issues.push(`Moderate dynamic range: DR${dynamicRange.drScore}`);
    } else {
      score -= 10;
      issues.push(`Poor dynamic range: DR${dynamicRange.drScore} — heavily compressed/limited`);
    }

    if (dynamicRange.clippedSamples > 0) {
      score -= 5;
      issues.push(`${dynamicRange.clippedSamples} clipped samples detected`);
    } else {
      positives.push('No clipping detected');
    }
  }

  score = Math.max(0, Math.min(100, score));

  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';

  const isGenuineHiRes = score >= 75 && !lossy?.isLossy && !bandwidth?.isUpsampled;

  return {
    type: 'verdict',
    timestamp: Date.now(),
    duration: performance.now() - start,
    score,
    grade,
    issues,
    positives,
    isGenuineHiRes,
  };
}
