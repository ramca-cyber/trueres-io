import { type HeaderParseResult } from '@/types/audio';

/**
 * Parse OGG container to detect Vorbis or Opus
 */
export function parseOgg(buffer: ArrayBuffer): HeaderParseResult {
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);

  // OGG page header is at offset 0
  // Skip to the first packet data (after page header)
  const numSegments = view.getUint8(26);
  let dataOffset = 27 + numSegments;

  // Check identification header
  let codec = 'Vorbis';
  let channels = 2;
  let sampleRate = 44100;
  let bitrate = 0;

  // Vorbis identification header: 0x01 + "vorbis"
  if (dataOffset + 30 < buffer.byteLength) {
    const packetType = view.getUint8(dataOffset);

    if (packetType === 0x01) {
      const sig = String.fromCharCode(
        u8[dataOffset + 1], u8[dataOffset + 2], u8[dataOffset + 3],
        u8[dataOffset + 4], u8[dataOffset + 5], u8[dataOffset + 6]
      );
      if (sig === 'vorbis') {
        codec = 'Vorbis';
        channels = view.getUint8(dataOffset + 11);
        sampleRate = view.getUint32(dataOffset + 12, true);
        const bitrateMax = view.getInt32(dataOffset + 16, true);
        const bitrateNominal = view.getInt32(dataOffset + 20, true);
        const bitrateMin = view.getInt32(dataOffset + 24, true);
        bitrate = bitrateNominal > 0 ? bitrateNominal : (bitrateMax > 0 ? bitrateMax : 0);
      }
    }

    // Opus identification: "OpusHead"
    const opusSig = String.fromCharCode(
      u8[dataOffset], u8[dataOffset + 1], u8[dataOffset + 2], u8[dataOffset + 3],
      u8[dataOffset + 4], u8[dataOffset + 5], u8[dataOffset + 6], u8[dataOffset + 7]
    );
    if (opusSig === 'OpusHead') {
      codec = 'Opus';
      channels = view.getUint8(dataOffset + 9);
      sampleRate = view.getUint32(dataOffset + 12, true); // original sample rate
    }
  }

  const duration = bitrate > 0 ? (buffer.byteLength * 8) / bitrate : 0;

  return {
    format: 'ogg',
    sampleRate,
    bitDepth: 0,
    channels,
    duration,
    codec,
    bitrate,
    lossless: false,
    raw: { codec, numSegments },
  };
}
