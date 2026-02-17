import { type DynamicRangeResult } from '@/types/analysis';

/**
 * Measure dynamic range (DR score), crest factor, and clipping
 * Based on the TT Dynamic Range Meter methodology
 */
export function measureDynamicRange(
  channelData: Float32Array[],
  sampleRate: number
): DynamicRangeResult {
  const start = performance.now();
  const numChannels = channelData.length;
  const length = channelData[0].length;

  // Block-based analysis (3-second blocks)
  const blockSamples = Math.round(sampleRate * 3);
  const numBlocks = Math.max(1, Math.floor(length / blockSamples));

  const blockDR: number[] = [];
  let globalPeak = 0;
  let globalRmsSum = 0;
  let clippedSamples = 0;
  const clipThreshold = 0.99;

  for (let b = 0; b < numBlocks; b++) {
    const offset = b * blockSamples;
    let blockPeak = 0;
    let blockRmsSum = 0;
    let blockSampleCount = 0;

    for (let ch = 0; ch < numChannels; ch++) {
      for (let i = 0; i < blockSamples; i++) {
        const idx = offset + i;
        if (idx >= channelData[ch].length) break;

        const sample = channelData[ch][idx];
        const abs = Math.abs(sample);

        if (abs > blockPeak) blockPeak = abs;
        if (abs > globalPeak) globalPeak = abs;
        blockRmsSum += sample * sample;
        blockSampleCount++;

        if (abs >= clipThreshold) clippedSamples++;
      }
    }

    const blockRms = blockSampleCount > 0
      ? Math.sqrt(blockRmsSum / blockSampleCount)
      : 0;

    if (blockPeak > 0 && blockRms > 0) {
      const dr = 20 * Math.log10(blockPeak / blockRms);
      blockDR.push(dr);
    }

    globalRmsSum += blockRmsSum;
  }

  // DR score: take the second-highest peak-to-RMS ratio
  blockDR.sort((a, b) => b - a);
  const drScore = blockDR.length >= 2
    ? Math.round(blockDR[1])
    : blockDR.length === 1
      ? Math.round(blockDR[0])
      : 0;

  const totalSamples = numChannels * length;
  const globalRms = Math.sqrt(globalRmsSum / totalSamples);

  const crestFactor = globalPeak > 0 && globalRms > 0
    ? 20 * Math.log10(globalPeak / globalRms)
    : 0;

  const peakDbfs = globalPeak > 0 ? 20 * Math.log10(globalPeak) : -Infinity;
  const rmsDbfs = globalRms > 0 ? 20 * Math.log10(globalRms) : -Infinity;

  return {
    type: 'dynamicRange',
    timestamp: Date.now(),
    duration: performance.now() - start,
    drScore,
    crestFactor,
    peakDbfs,
    rmsDbfs,
    clippedSamples,
  };
}
