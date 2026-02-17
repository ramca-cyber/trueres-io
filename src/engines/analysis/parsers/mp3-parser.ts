import { type HeaderParseResult } from '@/types/audio';

const MP3_BITRATES: Record<string, number[]> = {
  'V1L1': [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0],
  'V1L2': [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],
  'V1L3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],
  'V2L1': [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0],
  'V2L2': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
  'V2L3': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],
};

const SAMPLE_RATES: Record<number, number[]> = {
  0: [44100, 22050, 11025],
  1: [48000, 24000, 12000],
  2: [32000, 16000, 8000],
};

/**
 * Find the first MP3 sync word, skipping ID3v2 tags
 */
function findSyncWord(view: DataView): number {
  let offset = 0;

  // Skip ID3v2 tag if present
  if (view.getUint8(0) === 0x49 && view.getUint8(1) === 0x44 && view.getUint8(2) === 0x33) {
    const flags = view.getUint8(5);
    const size =
      (view.getUint8(6) << 21) |
      (view.getUint8(7) << 14) |
      (view.getUint8(8) << 7) |
      view.getUint8(9);
    offset = 10 + size;
    if (flags & 0x10) offset += 10; // footer
  }

  // Search for sync word
  const limit = Math.min(view.byteLength - 1, offset + 4096);
  for (let i = offset; i < limit; i++) {
    if (view.getUint8(i) === 0xFF && (view.getUint8(i + 1) & 0xE0) === 0xE0) {
      return i;
    }
  }
  return -1;
}

/**
 * Parse MP3 file header
 */
export function parseMp3(buffer: ArrayBuffer): HeaderParseResult {
  const view = new DataView(buffer);
  const syncOffset = findSyncWord(view);

  if (syncOffset < 0) {
    return { format: 'mp3', sampleRate: 0, bitDepth: 0, channels: 0, lossless: false, raw: {} };
  }

  const byte1 = view.getUint8(syncOffset + 1);
  const byte2 = view.getUint8(syncOffset + 2);
  const byte3 = view.getUint8(syncOffset + 3);

  const mpegVersion = (byte1 >> 3) & 0x03; // 0=2.5, 2=2, 3=1
  const layer = (byte1 >> 1) & 0x03; // 1=III, 2=II, 3=I
  const bitrateIndex = (byte2 >> 4) & 0x0F;
  const srIndex = (byte2 >> 2) & 0x03;
  const channelMode = (byte3 >> 6) & 0x03;

  const versionKey = mpegVersion === 3 ? 'V1' : 'V2';
  const layerKey = layer === 3 ? 'L1' : layer === 2 ? 'L2' : 'L3';
  const bitrateTable = MP3_BITRATES[`${versionKey}${layerKey}`] || MP3_BITRATES['V1L3'];
  const bitrate = (bitrateTable[bitrateIndex] || 128) * 1000;

  const srTable = SAMPLE_RATES[srIndex];
  const sampleRate = srTable ? srTable[mpegVersion === 3 ? 0 : mpegVersion === 2 ? 1 : 2] : 44100;

  const channels = channelMode === 3 ? 1 : 2;
  const channelModeStr = ['Stereo', 'Joint Stereo', 'Dual Channel', 'Mono'][channelMode];

  // Estimate duration from file size and bitrate
  const duration = bitrate > 0 ? (buffer.byteLength * 8) / bitrate : 0;

  // Check for Xing/VBRI header
  let vbr = false;
  let totalFrames = 0;
  const xingOffset = syncOffset + (mpegVersion === 3 ? (channels === 1 ? 21 : 36) : (channels === 1 ? 13 : 21));

  if (xingOffset + 12 < buffer.byteLength) {
    const tag = String.fromCharCode(
      view.getUint8(xingOffset), view.getUint8(xingOffset + 1),
      view.getUint8(xingOffset + 2), view.getUint8(xingOffset + 3)
    );
    if (tag === 'Xing' || tag === 'Info') {
      vbr = tag === 'Xing';
      const flags = view.getUint32(xingOffset + 4);
      if (flags & 1) {
        totalFrames = view.getUint32(xingOffset + 8);
      }
    }
  }

  const samplesPerFrame = layer === 3 ? 384 : (layer === 2 ? 1152 : (mpegVersion === 3 ? 1152 : 576));
  const vbrDuration = totalFrames > 0 ? (totalFrames * samplesPerFrame) / sampleRate : 0;

  return {
    format: 'mp3',
    sampleRate,
    bitDepth: 0, // MP3 doesn't have a fixed bit depth
    channels,
    duration: vbrDuration || duration,
    codec: `MPEG-${mpegVersion === 3 ? '1' : '2'} Layer ${4 - layer}`,
    bitrate,
    lossless: false,
    raw: {
      mpegVersion, layer, bitrateIndex, channelMode: channelModeStr,
      vbr, totalFrames, samplesPerFrame, syncOffset,
    },
  };
}
