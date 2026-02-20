import { type HeaderParseResult, type AudioFormat } from '@/types/audio';
import { detectFormat, detectFormatFromName } from './format-detect';
import { parseWav } from '../parsers/wav-parser';
import { parseFlac } from '../parsers/flac-parser';
import { parseMp3 } from '../parsers/mp3-parser';
import { parseAiff } from '../parsers/aiff-parser';
import { parseOgg } from '../parsers/ogg-parser';
import { parseMp4 } from '../parsers/mp4-parser';
import { type PCMData } from '@/types/audio';

/**
 * Parse file header (instant, no decode)
 */
export function parseHeader(buffer: ArrayBuffer, fileName: string): HeaderParseResult {
  let format = detectFormat(buffer);
  if (format === 'unknown') {
    format = detectFormatFromName(fileName);
  }

  switch (format) {
    case 'wav': return parseWav(buffer);
    case 'flac': return parseFlac(buffer);
    case 'mp3': return parseMp3(buffer);
    case 'aiff': return parseAiff(buffer);
    case 'ogg':
    case 'opus': return parseOgg(buffer);
    case 'm4a':
    case 'aac':
    case 'alac': return parseMp4(buffer);
    default:
      return {
        format,
        sampleRate: 0,
        bitDepth: 0,
        channels: 0,
        lossless: false,
        raw: {},
      };
  }
}

// Shared AudioContext for decoding — avoids hitting the browser's concurrent context limit
let sharedDecodeCtx: AudioContext | null = null;

function getDecodeCtx(): AudioContext {
  if (!sharedDecodeCtx || sharedDecodeCtx.state === 'closed') {
    sharedDecodeCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedDecodeCtx;
}

/**
 * Decode audio to PCM using Web Audio API (tier 1)
 */
export async function decodeAudio(
  buffer: ArrayBuffer,
  onProgress?: (progress: number) => void
): Promise<PCMData> {
  onProgress?.(10);

  const audioCtx = getDecodeCtx();

  onProgress?.(30);
  const audioBuffer = await audioCtx.decodeAudioData(buffer.slice(0));
  onProgress?.(80);

  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch++) {
    channelData.push(audioBuffer.getChannelData(ch));
  }

  onProgress?.(100);

  return {
    channelData,
    sampleRate: audioBuffer.sampleRate,
    numberOfChannels: audioBuffer.numberOfChannels,
    length: audioBuffer.length,
    duration: audioBuffer.duration,
  };
}
