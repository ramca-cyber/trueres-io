import { type AudioMetadata } from '@/types/audio';

/**
 * Parse Vorbis Comments (used in FLAC, OGG)
 */
export function parseVorbisComments(buffer: ArrayBuffer, offset: number, length: number): AudioMetadata {
  const view = new DataView(buffer);
  const meta: AudioMetadata = { additionalTags: {} };

  try {
    let pos = offset;
    const end = offset + length;

    // Vendor string
    const vendorLen = view.getUint32(pos, true);
    pos += 4 + vendorLen;

    // Number of comments
    const numComments = view.getUint32(pos, true);
    pos += 4;

    const decoder = new TextDecoder('utf-8');

    for (let i = 0; i < numComments && pos < end; i++) {
      const commentLen = view.getUint32(pos, true);
      pos += 4;

      if (pos + commentLen > end) break;

      const comment = decoder.decode(new Uint8Array(buffer, pos, commentLen));
      pos += commentLen;

      const eqIndex = comment.indexOf('=');
      if (eqIndex < 0) continue;

      const key = comment.substring(0, eqIndex).toUpperCase();
      const value = comment.substring(eqIndex + 1);

      switch (key) {
        case 'TITLE': meta.title = value; break;
        case 'ARTIST': meta.artist = value; break;
        case 'ALBUM': meta.album = value; break;
        case 'DATE':
        case 'YEAR': meta.year = value; break;
        case 'GENRE': meta.genre = value; break;
        case 'TRACKNUMBER': meta.trackNumber = value; break;
        case 'COMMENT':
        case 'DESCRIPTION': meta.comment = value; break;
        default:
          if (meta.additionalTags) meta.additionalTags[key] = value;
      }
    }
  } catch {
    // Ignore parse errors
  }

  return meta;
}

/**
 * Find and parse Vorbis Comments in a FLAC file
 */
export function parseFlacVorbisComments(buffer: ArrayBuffer): AudioMetadata {
  const view = new DataView(buffer);
  let offset = 4; // skip 'fLaC' marker

  while (offset < buffer.byteLength - 4) {
    const blockHeader = view.getUint8(offset);
    const isLast = (blockHeader & 0x80) !== 0;
    const blockType = blockHeader & 0x7F;
    const blockLength = (view.getUint8(offset + 1) << 16) | (view.getUint8(offset + 2) << 8) | view.getUint8(offset + 3);

    if (blockType === 4) {
      // Vorbis Comment block
      return parseVorbisComments(buffer, offset + 4, blockLength);
    }

    offset += 4 + blockLength;
    if (isLast) break;
  }

  return { additionalTags: {} };
}
