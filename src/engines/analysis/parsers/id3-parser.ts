import { type AudioMetadata } from '@/types/audio';

/**
 * Parse ID3v2 tags from MP3 files
 */
export function parseId3(buffer: ArrayBuffer): AudioMetadata {
  const view = new DataView(buffer);
  const u8 = new Uint8Array(buffer);
  const meta: AudioMetadata = { additionalTags: {} };

  // Check for ID3v2
  if (u8[0] !== 0x49 || u8[1] !== 0x44 || u8[2] !== 0x33) {
    // Try ID3v1 at end
    return parseId3v1(buffer);
  }

  const version = view.getUint8(3);
  const flags = view.getUint8(5);
  const size = decodeSyncsafe(view, 6);
  const hasExtHeader = (flags & 0x40) !== 0;

  let offset = 10;
  if (hasExtHeader) {
    const extSize = version >= 4
      ? decodeSyncsafe(view, offset)
      : view.getUint32(offset);
    offset += extSize;
  }

  const end = Math.min(10 + size, buffer.byteLength);

  while (offset < end - 10) {
    const frameId = String.fromCharCode(
      u8[offset], u8[offset + 1], u8[offset + 2], u8[offset + 3]
    );

    if (frameId[0] === '\0') break;

    const frameSize = version >= 4
      ? decodeSyncsafe(view, offset + 4)
      : view.getUint32(offset + 4);

    const frameFlags = view.getUint16(offset + 8);
    const frameData = offset + 10;
    const frameEnd = frameData + frameSize;

    if (frameSize === 0 || frameEnd > end) break;

    // Text frames
    if (frameId.startsWith('T') && frameId !== 'TXXX') {
      const encoding = u8[frameData];
      const text = decodeText(u8, frameData + 1, frameSize - 1, encoding);

      switch (frameId) {
        case 'TIT2': meta.title = text; break;
        case 'TPE1': meta.artist = text; break;
        case 'TALB': meta.album = text; break;
        case 'TDRC':
        case 'TYER': meta.year = text; break;
        case 'TCON': meta.genre = text.replace(/^\(\d+\)/, ''); break;
        case 'TRCK': meta.trackNumber = text; break;
        default:
          if (meta.additionalTags) meta.additionalTags[frameId] = text;
      }
    }

    // Comment
    if (frameId === 'COMM' && frameSize > 4) {
      const encoding = u8[frameData];
      meta.comment = decodeText(u8, frameData + 4, frameSize - 4, encoding);
    }

    // Attached picture (APIC)
    if (frameId === 'APIC' && frameSize > 4) {
      try {
        const encoding = u8[frameData];
        let i = frameData + 1;
        // Skip MIME type (null-terminated)
        while (i < frameEnd && u8[i] !== 0) i++;
        i++; // skip null
        i++; // skip picture type
        // Skip description (null-terminated)
        while (i < frameEnd && u8[i] !== 0) i++;
        i++; // skip null
        if (encoding === 1 || encoding === 2) i++; // UTF-16 has double null

        const imageData = buffer.slice(i, frameEnd);
        meta.coverArt = new Blob([imageData]);
      } catch {
        // Ignore malformed APIC
      }
    }

    offset = frameEnd;
  }

  return meta;
}

function parseId3v1(buffer: ArrayBuffer): AudioMetadata {
  const meta: AudioMetadata = { additionalTags: {} };
  if (buffer.byteLength < 128) return meta;

  const u8 = new Uint8Array(buffer, buffer.byteLength - 128, 128);
  if (u8[0] !== 0x54 || u8[1] !== 0x41 || u8[2] !== 0x47) return meta;

  const decoder = new TextDecoder('iso-8859-1');
  meta.title = decoder.decode(u8.slice(3, 33)).replace(/\0+$/, '').trim();
  meta.artist = decoder.decode(u8.slice(33, 63)).replace(/\0+$/, '').trim();
  meta.album = decoder.decode(u8.slice(63, 93)).replace(/\0+$/, '').trim();
  meta.year = decoder.decode(u8.slice(93, 97)).replace(/\0+$/, '').trim();
  meta.comment = decoder.decode(u8.slice(97, 127)).replace(/\0+$/, '').trim();

  return meta;
}

function decodeSyncsafe(view: DataView, offset: number): number {
  return (
    (view.getUint8(offset) << 21) |
    (view.getUint8(offset + 1) << 14) |
    (view.getUint8(offset + 2) << 7) |
    view.getUint8(offset + 3)
  );
}

function decodeText(u8: Uint8Array, offset: number, length: number, encoding: number): string {
  const data = u8.slice(offset, offset + length);
  // Remove null terminators
  let end = data.length;
  while (end > 0 && data[end - 1] === 0) end--;
  const trimmed = data.slice(0, end);

  switch (encoding) {
    case 0: // ISO-8859-1
      return new TextDecoder('iso-8859-1').decode(trimmed);
    case 1: // UTF-16 with BOM
      return new TextDecoder('utf-16').decode(trimmed);
    case 2: // UTF-16BE
      return new TextDecoder('utf-16be').decode(trimmed);
    case 3: // UTF-8
      return new TextDecoder('utf-8').decode(trimmed);
    default:
      return new TextDecoder('iso-8859-1').decode(trimmed);
  }
}
