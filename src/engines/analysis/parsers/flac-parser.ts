import { type HeaderParseResult } from '@/types/audio';

/**
 * Parse FLAC file header (STREAMINFO metadata block)
 */
export function parseFlac(buffer: ArrayBuffer): HeaderParseResult {
  const view = new DataView(buffer);
  // Skip fLaC marker (4 bytes)
  // First metadata block header
  const blockType = view.getUint8(4) & 0x7F;
  const blockLength = (view.getUint8(5) << 16) | (view.getUint8(6) << 8) | view.getUint8(7);

  if (blockType !== 0 || blockLength < 34) {
    return { format: 'flac', sampleRate: 0, bitDepth: 0, channels: 0, lossless: true, raw: {} };
  }

  // STREAMINFO starts at offset 8
  const base = 8;
  const minBlockSize = view.getUint16(base, false);
  const maxBlockSize = view.getUint16(base + 2, false);
  const minFrameSize = (view.getUint8(base + 4) << 16) | (view.getUint8(base + 5) << 8) | view.getUint8(base + 6);
  const maxFrameSize = (view.getUint8(base + 7) << 16) | (view.getUint8(base + 8) << 8) | view.getUint8(base + 9);

  // Bytes 10-13 contain sample rate (20 bits), channels (3 bits), bit depth (5 bits), total samples (36 bits)
  const b10 = view.getUint8(base + 10);
  const b11 = view.getUint8(base + 11);
  const b12 = view.getUint8(base + 12);
  const b13 = view.getUint8(base + 13);
  const b14 = view.getUint8(base + 14);
  const b15 = view.getUint8(base + 15);
  const b16 = view.getUint8(base + 16);
  const b17 = view.getUint8(base + 17);

  const sampleRate = (b10 << 12) | (b11 << 4) | (b12 >> 4);
  const channels = ((b12 >> 1) & 0x07) + 1;
  const bitDepth = (((b12 & 0x01) << 4) | (b13 >> 4)) + 1;
  const totalSamples = ((b13 & 0x0F) * 2 ** 32) + (b14 << 24) + (b15 << 16) + (b16 << 8) + b17;

  const duration = sampleRate > 0 ? totalSamples / sampleRate : 0;

  // MD5 signature (16 bytes at base + 18)
  const md5Bytes: string[] = [];
  for (let i = 0; i < 16; i++) {
    md5Bytes.push(view.getUint8(base + 18 + i).toString(16).padStart(2, '0'));
  }
  const md5 = md5Bytes.join('');

  return {
    format: 'flac',
    sampleRate,
    bitDepth,
    channels,
    duration,
    codec: 'FLAC',
    bitrate: duration > 0 ? Math.round((buffer.byteLength * 8) / duration) : 0,
    lossless: true,
    raw: { minBlockSize, maxBlockSize, minFrameSize, maxFrameSize, totalSamples, md5 },
  };
}
