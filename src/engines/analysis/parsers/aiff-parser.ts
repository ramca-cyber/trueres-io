import { type HeaderParseResult } from '@/types/audio';

/**
 * Parse AIFF/AIFC file header
 */
export function parseAiff(buffer: ArrayBuffer): HeaderParseResult {
  const view = new DataView(buffer);
  const formType = String.fromCharCode(
    view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11)
  );
  const isCompressed = formType === 'AIFC';

  let channels = 2;
  let totalFrames = 0;
  let bitDepth = 16;
  let sampleRate = 44100;
  let codec = 'PCM';

  let offset = 12;
  while (offset < buffer.byteLength - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset), view.getUint8(offset + 1),
      view.getUint8(offset + 2), view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4);

    if (chunkId === 'COMM') {
      channels = view.getInt16(offset + 8);
      totalFrames = view.getUint32(offset + 10);
      bitDepth = view.getInt16(offset + 14);
      // 80-bit IEEE 754 extended precision float for sample rate
      sampleRate = parseIeee80(buffer, offset + 16);

      if (isCompressed && chunkSize > 18) {
        const compType = String.fromCharCode(
          view.getUint8(offset + 26), view.getUint8(offset + 27),
          view.getUint8(offset + 28), view.getUint8(offset + 29)
        );
        codec = compType.trim();
      }
    }

    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset++;
  }

  const duration = sampleRate > 0 ? totalFrames / sampleRate : 0;

  return {
    format: 'aiff',
    sampleRate,
    bitDepth,
    channels,
    duration,
    codec,
    bitrate: sampleRate * bitDepth * channels,
    lossless: codec === 'PCM' || codec === 'NONE',
    raw: { formType, totalFrames, isCompressed },
  };
}

/**
 * Parse 80-bit IEEE 754 extended precision float (big-endian)
 */
function parseIeee80(buffer: ArrayBuffer, offset: number): number {
  const view = new DataView(buffer);
  const exponent = view.getUint16(offset);
  const mantissa = view.getUint32(offset + 2);
  const mantissaLow = view.getUint32(offset + 6);

  const sign = (exponent >> 15) & 1;
  const exp = exponent & 0x7FFF;

  if (exp === 0 && mantissa === 0 && mantissaLow === 0) return 0;

  const f = mantissa * Math.pow(2, -31) + mantissaLow * Math.pow(2, -63);
  const value = Math.pow(2, exp - 16383) * f;
  return sign ? -value : value;
}
