import { type HeaderParseResult } from '@/types/audio';

/**
 * Parse WAV (RIFF/WAVE) file header
 */
export function parseWav(buffer: ArrayBuffer): HeaderParseResult {
  const view = new DataView(buffer);

  // Find fmt chunk
  let offset = 12; // skip RIFF header
  let audioFormat = 1;
  let channels = 2;
  let sampleRate = 44100;
  let bitsPerSample = 16;
  let byteRate = 0;
  let dataSize = 0;

  while (offset < buffer.byteLength - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset), view.getUint8(offset + 1),
      view.getUint8(offset + 2), view.getUint8(offset + 3)
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'fmt ') {
      audioFormat = view.getUint16(offset + 8, true);
      channels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      byteRate = view.getUint32(offset + 16, true);
      bitsPerSample = view.getUint16(offset + 22, true);

      // Handle extensible format
      if (audioFormat === 0xFFFE && chunkSize >= 40) {
        bitsPerSample = view.getUint16(offset + 26, true); // valid bits per sample
        audioFormat = view.getUint16(offset + 32, true); // sub format
      }
    } else if (chunkId === 'data') {
      dataSize = chunkSize;
    }

    offset += 8 + chunkSize;
    if (chunkSize % 2 !== 0) offset++; // word alignment
  }

  const blockAlign = channels * (bitsPerSample / 8);
  const totalSamples = blockAlign > 0 ? dataSize / blockAlign : 0;
  const duration = sampleRate > 0 ? totalSamples / sampleRate : 0;

  return {
    format: 'wav',
    sampleRate,
    bitDepth: bitsPerSample,
    channels,
    duration,
    codec: audioFormat === 1 ? 'PCM' : audioFormat === 3 ? 'IEEE Float' : `Format ${audioFormat}`,
    bitrate: byteRate * 8,
    lossless: true,
    raw: { audioFormat, byteRate, dataSize, totalSamples },
  };
}
