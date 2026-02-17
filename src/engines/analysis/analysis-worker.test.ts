import { describe, it, expect, vi } from 'vitest';

/**
 * Tests for the analysis worker client fallback path.
 * In the vitest (Node) environment, Worker is not available,
 * so runAnalysisInWorker should return null (triggering main-thread fallback).
 *
 * We also test the main-thread analysis modules directly with synthetic data.
 */
import { analyzeBitDepth } from '@/engines/analysis/modules/bit-depth';
import { analyzeBandwidth } from '@/engines/analysis/modules/bandwidth';
import { detectLossy } from '@/engines/analysis/modules/lossy-detect';
import { measureLUFS } from '@/engines/analysis/modules/lufs';
import { measureDynamicRange } from '@/engines/analysis/modules/dynamic-range';
import { analyzeStereo } from '@/engines/analysis/modules/stereo';
import { computeWaveform } from '@/engines/analysis/modules/waveform';
import { computeSpectrum } from '@/engines/analysis/modules/spectrum';
import { computeVerdict } from '@/engines/analysis/modules/verdict';

// Generate a 1-second 440Hz sine wave at 44100Hz
function makeSine(freq = 440, sr = 44100, duration = 1): Float32Array {
  const length = sr * duration;
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    data[i] = Math.sin(2 * Math.PI * freq * i / sr) * 0.5;
  }
  return data;
}

describe('Worker client fallback', () => {
  it('runAnalysisInWorker returns null when Worker is unavailable', async () => {
    // Dynamic import to avoid hoisting issues
    const { runAnalysisInWorker } = await import('@/engines/analysis/worker-client');
    const result = runAnalysisInWorker('bitDepth', {
      channelData: [makeSine()],
      sampleRate: 44100,
      bitDepth: 16,
    });
    expect(result).toBeNull();
  });
});

describe('Analysis modules with synthetic data', () => {
  const sine = makeSine();
  const channelData = [sine, sine]; // stereo
  const sampleRate = 44100;

  it('analyzeBitDepth returns valid result', () => {
    const r = analyzeBitDepth(channelData, 16);
    expect(r.type).toBe('bitDepth');
    expect(r.effectiveBitDepth).toBeGreaterThan(0);
    expect(r.effectiveBitDepth).toBeLessThanOrEqual(32);
  });

  it('analyzeBandwidth returns valid result', () => {
    const r = analyzeBandwidth(channelData, sampleRate);
    expect(r.type).toBe('bandwidth');
    expect(r.frequencyCeiling).toBeGreaterThan(0);
  });

  it('detectLossy returns valid result', () => {
    const r = detectLossy(channelData, sampleRate);
    expect(r.type).toBe('lossyDetect');
    expect(typeof r.isLossy).toBe('boolean');
  });

  it('measureLUFS returns valid result', () => {
    const r = measureLUFS(channelData, sampleRate);
    expect(r.type).toBe('lufs');
    expect(r.integrated).toBeLessThan(0); // sine at 0.5 amplitude should be negative LUFS
  });

  it('measureDynamicRange returns valid result', () => {
    const r = measureDynamicRange(channelData, sampleRate);
    expect(r.type).toBe('dynamicRange');
    expect(r.drScore).toBeGreaterThanOrEqual(0);
  });

  it('analyzeStereo returns valid result', () => {
    const r = analyzeStereo(channelData);
    expect(r.type).toBe('stereo');
    expect(r.correlation).toBeCloseTo(1, 1); // identical channels = correlation 1
  });

  it('computeWaveform returns peaks and rms', () => {
    const r = computeWaveform(sine);
    expect(r.peaks.length).toBeGreaterThan(0);
    expect(r.rms.length).toBeGreaterThan(0);
  });

  it('computeSpectrum returns magnitudes and frequencies', () => {
    const r = computeSpectrum(channelData, sampleRate);
    expect(r.magnitudes.length).toBeGreaterThan(0);
    expect(r.frequencies.length).toBeGreaterThan(0);
  });

  it('computeVerdict returns score and grade', () => {
    const bd = analyzeBitDepth(channelData, 16);
    const bw = analyzeBandwidth(channelData, sampleRate);
    const ld = detectLossy(channelData, sampleRate);
    const dr = measureDynamicRange(channelData, sampleRate);
    const v = computeVerdict(bd, bw, ld, dr, 16, 44100);
    expect(v.type).toBe('verdict');
    expect(v.score).toBeGreaterThanOrEqual(0);
    expect(v.score).toBeLessThanOrEqual(100);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(v.grade);
  });
});
