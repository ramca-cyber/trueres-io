import { useCallback } from 'react';
import { useAudioStore } from '@/stores/audio-store';
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
 * Hook for running analyses with caching
 */
export function useAnalysis() {
  const store = useAudioStore();

  const runAnalysis = useCallback(async (key: AnalysisKey): Promise<AnalysisResult | null> => {
    // Check cache
    if (store.isAnalysisCached(key)) {
      return store.getAnalysis(key) || null;
    }

    // Check if already running
    if (store.isAnalyzing(key)) return null;

    const pcm = store.pcm;
    const headerInfo = store.headerInfo;
    if (!pcm) return null;

    store.setAnalyzing(key, true);

    try {
      let result: AnalysisResult | null = null;

      switch (key) {
        case 'bitDepth':
          result = analyzeBitDepth(pcm.channelData, headerInfo?.bitDepth || 16);
          break;
        case 'bandwidth':
          result = analyzeBandwidth(pcm.channelData, pcm.sampleRate);
          break;
        case 'lossyDetect':
          result = detectLossy(pcm.channelData, pcm.sampleRate);
          break;
        case 'lufs':
          result = measureLUFS(pcm.channelData, pcm.sampleRate);
          break;
        case 'dynamicRange':
          result = measureDynamicRange(pcm.channelData, pcm.sampleRate);
          break;
        case 'stereo':
          result = analyzeStereo(pcm.channelData);
          break;
        case 'waveform':
          result = { type: 'waveform', timestamp: Date.now(), duration: 0, ...computeWaveform(pcm.channelData[0]) } as any;
          break;
        case 'spectrum':
          result = { type: 'spectrum', timestamp: Date.now(), duration: 0, ...computeSpectrum(pcm.channelData, pcm.sampleRate) } as any;
          break;
        case 'spectrogram':
          result = { type: 'spectrogram', timestamp: Date.now(), duration: 0, ...computeSpectrogram(pcm.channelData[0], pcm.sampleRate) } as any;
          break;
        case 'verdict': {
          // Verdict depends on other analyses — run them first if not cached
          const bd = store.getAnalysis<BitDepthResult>('bitDepth') || analyzeBitDepth(pcm.channelData, headerInfo?.bitDepth || 16);
          const bw = store.getAnalysis<BandwidthResult>('bandwidth') || analyzeBandwidth(pcm.channelData, pcm.sampleRate);
          const ld = store.getAnalysis<LossyDetectResult>('lossyDetect') || detectLossy(pcm.channelData, pcm.sampleRate);
          const dr = store.getAnalysis<DynamicRangeResult>('dynamicRange') || measureDynamicRange(pcm.channelData, pcm.sampleRate);

          // Cache sub-results
          if (!store.isAnalysisCached('bitDepth')) store.cacheAnalysis('bitDepth', bd);
          if (!store.isAnalysisCached('bandwidth')) store.cacheAnalysis('bandwidth', bw);
          if (!store.isAnalysisCached('lossyDetect')) store.cacheAnalysis('lossyDetect', ld);
          if (!store.isAnalysisCached('dynamicRange')) store.cacheAnalysis('dynamicRange', dr);

          result = computeVerdict(
            bd as BitDepthResult, bw as BandwidthResult,
            ld as LossyDetectResult, dr as DynamicRangeResult,
            headerInfo?.bitDepth || 16, headerInfo?.sampleRate || 44100
          );
          break;
        }
      }

      if (result) {
        store.cacheAnalysis(key, result);
      }

      return result;
    } catch (e) {
      console.error(`Analysis ${key} failed:`, e);
      store.setAnalyzing(key, false);
      return null;
    }
  }, [store]);

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
