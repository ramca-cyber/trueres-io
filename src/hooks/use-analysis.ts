import { useCallback } from 'react';
import { useAudioStore } from '@/stores/audio-store';
import { runAnalysisInWorker } from '@/engines/analysis/worker-client';
import { analyzeBitDepth } from '@/engines/analysis/modules/bit-depth';
import { analyzeBandwidth } from '@/engines/analysis/modules/bandwidth';
import { detectLossy } from '@/engines/analysis/modules/lossy-detect';
import { measureLUFS } from '@/engines/analysis/modules/lufs';
import { measureDynamicRange } from '@/engines/analysis/modules/dynamic-range';
import { analyzeStereo } from '@/engines/analysis/modules/stereo';
import { computeWaveform } from '@/engines/analysis/modules/waveform';
import { computeSpectrum } from '@/engines/analysis/modules/spectrum';
import { computeSpectrogram } from '@/engines/analysis/modules/spectrogram';
import { computeVerdict } from '@/engines/analysis/modules/verdict';
import { type AnalysisResult, type BitDepthResult, type BandwidthResult, type LossyDetectResult, type DynamicRangeResult, type LUFSResult, type StereoResult, type VerdictResult, type WaveformData, type SpectrumData, type SpectrogramData } from '@/types/analysis';

type AnalysisKey = 'bitDepth' | 'bandwidth' | 'lossyDetect' | 'lufs' | 'dynamicRange' | 'stereo' | 'waveform' | 'spectrum' | 'spectrogram' | 'verdict';

/**
 * Hook for running analyses with caching.
 * Offloads work to a Web Worker when available, falls back to main thread.
 */
export function useAnalysis() {
  const store = useAudioStore();

  /**
   * Main-thread fallback — mirrors the worker dispatch.
   */
  const runOnMainThread = useCallback((key: AnalysisKey, pcm: { channelData: Float32Array[]; sampleRate: number }, headerInfo: any): AnalysisResult | null => {
    switch (key) {
      case 'bitDepth':
        return analyzeBitDepth(pcm.channelData, headerInfo?.bitDepth || 16);
      case 'bandwidth':
        return analyzeBandwidth(pcm.channelData, pcm.sampleRate);
      case 'lossyDetect':
        return detectLossy(pcm.channelData, pcm.sampleRate);
      case 'lufs':
        return measureLUFS(pcm.channelData, pcm.sampleRate);
      case 'dynamicRange':
        return measureDynamicRange(pcm.channelData, pcm.sampleRate);
      case 'stereo':
        return analyzeStereo(pcm.channelData);
      case 'waveform':
        return { type: 'waveform', timestamp: Date.now(), duration: 0, ...computeWaveform(pcm.channelData[0]) } as any;
      case 'spectrum':
        return { type: 'spectrum', timestamp: Date.now(), duration: 0, ...computeSpectrum(pcm.channelData, pcm.sampleRate) } as any;
      case 'spectrogram':
        return { type: 'spectrogram', timestamp: Date.now(), duration: 0, ...computeSpectrogram(pcm.channelData[0], pcm.sampleRate) } as any;
      case 'verdict': {
        const bd = store.getAnalysis<BitDepthResult>('bitDepth') || analyzeBitDepth(pcm.channelData, headerInfo?.bitDepth || 16);
        const bw = store.getAnalysis<BandwidthResult>('bandwidth') || analyzeBandwidth(pcm.channelData, pcm.sampleRate);
        const ld = store.getAnalysis<LossyDetectResult>('lossyDetect') || detectLossy(pcm.channelData, pcm.sampleRate);
        const dr = store.getAnalysis<DynamicRangeResult>('dynamicRange') || measureDynamicRange(pcm.channelData, pcm.sampleRate);
        if (!store.isAnalysisCached('bitDepth')) store.cacheAnalysis('bitDepth', bd);
        if (!store.isAnalysisCached('bandwidth')) store.cacheAnalysis('bandwidth', bw);
        if (!store.isAnalysisCached('lossyDetect')) store.cacheAnalysis('lossyDetect', ld);
        if (!store.isAnalysisCached('dynamicRange')) store.cacheAnalysis('dynamicRange', dr);
        return computeVerdict(bd as BitDepthResult, bw as BandwidthResult, ld as LossyDetectResult, dr as DynamicRangeResult, headerInfo?.bitDepth || 16, headerInfo?.sampleRate || 44100);
      }
    }
  }, [store]);

  const runAnalysis = useCallback(async (key: AnalysisKey): Promise<AnalysisResult | null> => {
    if (store.isAnalysisCached(key)) {
      return store.getAnalysis(key) || null;
    }
    if (store.isAnalyzing(key)) return null;

    const pcm = store.pcm;
    const headerInfo = store.headerInfo;
    if (!pcm) return null;

    store.setAnalyzing(key, true);

    try {
      // Try worker first
      const workerPromise = runAnalysisInWorker(key, {
        channelData: pcm.channelData,
        sampleRate: pcm.sampleRate,
        bitDepth: headerInfo?.bitDepth,
        headerSampleRate: headerInfo?.sampleRate,
      });

      if (workerPromise) {
        const { result, subResults } = await workerPromise;

        // Cache verdict sub-results
        if (key === 'verdict' && subResults) {
          for (const [subKey, subResult] of Object.entries(subResults)) {
            if (!store.isAnalysisCached(subKey)) {
              store.cacheAnalysis(subKey, subResult);
            }
          }
        }

        if (result) store.cacheAnalysis(key, result);
        return result;
      }

      // Fallback to main thread
      const result = runOnMainThread(key, pcm, headerInfo);
      if (result) store.cacheAnalysis(key, result);
      return result;
    } catch (e) {
      console.error(`Analysis ${key} failed:`, e);
      return null;
    } finally {
      store.setAnalyzing(key, false);
    }
  }, [store, runOnMainThread]);

  const runMultiple = useCallback(async (keys: AnalysisKey[]) => {
    const results: Record<string, AnalysisResult | null> = {};
    for (const key of keys) {
      results[key] = await runAnalysis(key);
    }
    return results;
  }, [runAnalysis]);

  return {
    runAnalysis,
    runMultiple,
    getResult: <T extends AnalysisResult>(key: string) => store.getAnalysis<T>(key),
    isCached: store.isAnalysisCached,
    isAnalyzing: store.isAnalyzing,
    analyses: store.analyses,
  };
}
