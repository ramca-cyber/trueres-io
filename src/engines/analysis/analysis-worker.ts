/**
 * Web Worker for audio analysis — runs all analysis modules off the main thread.
 *
 * Message protocol:
 *   Request:  { id, key, channelData: Float32Array[], sampleRate, bitDepth, headerSampleRate }
 *   Response: { id, key, result, subResults?, error? }
 */

import { analyzeBitDepth } from './modules/bit-depth';
import { analyzeBandwidth } from './modules/bandwidth';
import { detectLossy } from './modules/lossy-detect';
import { measureLUFS } from './modules/lufs';
import { measureDynamicRange } from './modules/dynamic-range';
import { analyzeStereo } from './modules/stereo';
import { computeWaveform } from './modules/waveform';
import { computeSpectrum } from './modules/spectrum';
import { computeSpectrogram } from './modules/spectrogram';
import { computeVerdict } from './modules/verdict';
import type {
  BitDepthResult,
  BandwidthResult,
  LossyDetectResult,
  DynamicRangeResult,
} from '@/types/analysis';

self.onmessage = (e: MessageEvent) => {
  const { id, key, channelData, sampleRate, bitDepth, headerSampleRate } = e.data;

  try {
    let result: any = null;
    let subResults: Record<string, any> | undefined;

    switch (key) {
      case 'bitDepth':
        result = analyzeBitDepth(channelData, bitDepth || 16);
        break;
      case 'bandwidth':
        result = analyzeBandwidth(channelData, sampleRate);
        break;
      case 'lossyDetect':
        result = detectLossy(channelData, sampleRate);
        break;
      case 'lufs':
        result = measureLUFS(channelData, sampleRate);
        break;
      case 'dynamicRange':
        result = measureDynamicRange(channelData, sampleRate);
        break;
      case 'stereo':
        result = analyzeStereo(channelData);
        break;
      case 'waveform':
        result = {
          type: 'waveform',
          timestamp: Date.now(),
          duration: 0,
          ...computeWaveform(channelData[0]),
        };
        break;
      case 'spectrum':
        result = {
          type: 'spectrum',
          timestamp: Date.now(),
          duration: 0,
          ...computeSpectrum(channelData, sampleRate),
        };
        break;
      case 'spectrogram':
        result = {
          type: 'spectrogram',
          timestamp: Date.now(),
          duration: 0,
          ...computeSpectrogram(channelData[0], sampleRate),
        };
        break;
      case 'verdict': {
        const bd = analyzeBitDepth(channelData, bitDepth || 16);
        const bw = analyzeBandwidth(channelData, sampleRate);
        const ld = detectLossy(channelData, sampleRate);
        const dr = measureDynamicRange(channelData, sampleRate);
        result = computeVerdict(
          bd as BitDepthResult,
          bw as BandwidthResult,
          ld as LossyDetectResult,
          dr as DynamicRangeResult,
          bitDepth || 16,
          headerSampleRate || 44100,
        );
        subResults = { bitDepth: bd, bandwidth: bw, lossyDetect: ld, dynamicRange: dr };
        break;
      }
    }

    self.postMessage({ id, key, result, subResults });
  } catch (err: any) {
    self.postMessage({ id, key, result: null, error: err?.message || String(err) });
  }
};
