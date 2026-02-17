import { type HeaderParseResult } from '@/types/audio';

/**
 * Parse MP4/M4A container (minimal — reads ftyp, moov/trak/mdia/minf/stbl)
 */
export function parseMp4(buffer: ArrayBuffer): HeaderParseResult {
  const view = new DataView(buffer);
  let sampleRate = 44100;
  let channels = 2;
  let bitDepth = 16;
  let codec = 'AAC';
  let duration = 0;
  let timescale = 1;

  function readBoxes(start: number, end: number) {
    let offset = start;
    while (offset < end - 8) {
      let boxSize = view.getUint32(offset);
      const boxType = String.fromCharCode(
        view.getUint8(offset + 4), view.getUint8(offset + 5),
        view.getUint8(offset + 6), view.getUint8(offset + 7)
      );

      if (boxSize === 0) break;
      if (boxSize === 1 && offset + 16 <= end) {
        // 64-bit size — simplified, just skip
        boxSize = view.getUint32(offset + 12); // lower 32 bits
        // skip for now
      }

      const boxEnd = Math.min(offset + boxSize, end);

      switch (boxType) {
        case 'moov':
        case 'trak':
        case 'mdia':
        case 'minf':
        case 'stbl':
          readBoxes(offset + 8, boxEnd);
          break;

        case 'mvhd': {
          const version = view.getUint8(offset + 8);
          if (version === 0) {
            timescale = view.getUint32(offset + 20);
            const dur = view.getUint32(offset + 24);
            duration = timescale > 0 ? dur / timescale : 0;
          } else {
            timescale = view.getUint32(offset + 28);
            // 64-bit duration at offset+32, simplified
            const durHigh = view.getUint32(offset + 32);
            const durLow = view.getUint32(offset + 36);
            duration = timescale > 0 ? (durHigh * 4294967296 + durLow) / timescale : 0;
          }
          break;
        }

        case 'mp4a':
          if (offset + 36 < boxEnd) {
            channels = view.getUint16(offset + 24);
            bitDepth = view.getUint16(offset + 26);
            sampleRate = view.getUint16(offset + 32);
            codec = 'AAC';
          }
          break;

        case 'alac':
          codec = 'ALAC';
          if (offset + 24 < boxEnd) {
            // ALAC specific config
            bitDepth = view.getUint8(offset + 17);
            channels = view.getUint8(offset + 21);
            sampleRate = view.getUint32(offset + 24);
          }
          break;
      }

      offset = boxEnd;
    }
  }

  readBoxes(0, buffer.byteLength);

  return {
    format: 'm4a',
    sampleRate,
    bitDepth,
    channels,
    duration,
    codec,
    bitrate: duration > 0 ? Math.round((buffer.byteLength * 8) / duration) : 0,
    lossless: codec === 'ALAC',
    raw: { codec, timescale },
  };
}
