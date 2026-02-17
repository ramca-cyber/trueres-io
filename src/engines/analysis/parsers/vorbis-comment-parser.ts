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

/**
 * Find and parse Vorbis Comments in an OGG file
 */
export function parseOggVorbisComments(buffer: ArrayBuffer): AudioMetadata {
  const u8 = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // Find second OGG page (comment header)
  // First page is identification header, second contains comments
  let offset = 0;

  // Skip pages looking for comment header
  for (let page = 0; page < 10 && offset < buffer.byteLength - 27; page++) {
    // Verify OGG page sync
    if (u8[offset] !== 0x4F || u8[offset + 1] !== 0x67 ||
        u8[offset + 2] !== 0x67 || u8[offset + 3] !== 0x53) break;

    const numSegments = u8[offset + 26];
    let pageDataSize = 0;
    for (let s = 0; s < numSegments; s++) {
      pageDataSize += u8[offset + 27 + s];
    }
    const dataStart = offset + 27 + numSegments;

    if (page >= 1) {
      // Check for Vorbis comment header (0x03 + "vorbis")
      if (dataStart + 7 < buffer.byteLength && u8[dataStart] === 0x03) {
        const sig = String.fromCharCode(u8[dataStart + 1], u8[dataStart + 2], u8[dataStart + 3],
          u8[dataStart + 4], u8[dataStart + 5], u8[dataStart + 6]);
        if (sig === 'vorbis') {
          return parseVorbisComments(buffer, dataStart + 7, pageDataSize - 7);
        }
      }
      // Check for OpusTags
      if (dataStart + 8 < buffer.byteLength) {
        const opusSig = String.fromCharCode(u8[dataStart], u8[dataStart + 1], u8[dataStart + 2],
          u8[dataStart + 3], u8[dataStart + 4], u8[dataStart + 5], u8[dataStart + 6], u8[dataStart + 7]);
        if (opusSig === 'OpusTags') {
          return parseVorbisComments(buffer, dataStart + 8, pageDataSize - 8);
        }
      }
    }

    offset = dataStart + pageDataSize;
  }

  return { additionalTags: {} };
}
