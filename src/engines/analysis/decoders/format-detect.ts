import { type AudioFormat } from '@/types/audio';

/**
 * Detect audio/video format from file magic bytes
 */
export function detectFormat(buffer: ArrayBuffer): AudioFormat {
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 16));

  // RIFF/WAVE
  if (view.getUint32(0) === 0x52494646 && view.getUint32(8) === 0x57415645) {
    return 'wav';
  }

  // FLAC
  if (view.getUint32(0) === 0x664C6143) {
    return 'flac';
  }

  // AIFF / AIFC
  if (view.getUint32(0) === 0x464F524D) {
    const formType = view.getUint32(8);
    if (formType === 0x41494646 || formType === 0x41494643) return 'aiff';
  }

  // OGG
  if (view.getUint32(0) === 0x4F676753) {
    return 'ogg';
  }

  // MP3: ID3 tag or sync word
  if (u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) {
    return 'mp3'; // ID3v2 header
  }
  if (u8[0] === 0xFF && (u8[1] & 0xE0) === 0xE0) {
    return 'mp3'; // MPEG sync word
  }

  // MP4/M4A (ftyp box)
  if (view.getUint32(4) === 0x66747970) {
    return 'm4a';
  }

  // WMA (ASF header)
  if (
    view.getUint32(0) === 0x3026B275 &&
    view.getUint16(4) === 0x8E66
  ) {
    return 'wma';
  }

  // APE (MAC )
  if (u8[0] === 0x4D && u8[1] === 0x41 && u8[2] === 0x43 && u8[3] === 0x20) {
    return 'ape';
  }

  // WavPack
  if (u8[0] === 0x77 && u8[1] === 0x76 && u8[2] === 0x70 && u8[3] === 0x6B) {
    return 'wv';
  }

  // DSD (DSD )
  if (view.getUint32(0) === 0x44534420) {
    return 'dsd';
  }

  return 'unknown';
}

/**
 * Detect format from file extension as fallback
 */
export function detectFormatFromName(fileName: string): AudioFormat {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const map: Record<string, AudioFormat> = {
    wav: 'wav', wave: 'wav',
    flac: 'flac',
    aiff: 'aiff', aif: 'aiff',
    mp3: 'mp3',
    ogg: 'ogg', oga: 'ogg',
    opus: 'opus',
    aac: 'aac',
    m4a: 'm4a',
    alac: 'alac',
    wma: 'wma',
    ape: 'ape',
    wv: 'wv',
    dsd: 'dsd', dsf: 'dsd', dff: 'dsd',
  };
  return map[ext || ''] || 'unknown';
}
