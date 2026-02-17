import { useCallback } from 'react';
import { useAudioStore } from '@/stores/audio-store';
import { parseHeader } from '@/engines/analysis/decoders/decoder-manager';
import { decodeAudio } from '@/engines/analysis/decoders/decoder-manager';
import { parseId3 } from '@/engines/analysis/parsers/id3-parser';
import { parseFlacVorbisComments } from '@/engines/analysis/parsers/vorbis-comment-parser';

/**
 * Hook for loading and decoding audio files
 */
export function useAudioFile() {
  const store = useAudioStore();

  const loadFile = useCallback(async (file: File) => {
    // Read file to ArrayBuffer
    const buffer = await file.arrayBuffer();

    // Set file in store
    store.setFile(file, buffer);

    // Parse header (instant)
    try {
      const headerInfo = parseHeader(buffer, file.name);
      store.setHeaderInfo(headerInfo);

      // Parse metadata
      if (headerInfo.format === 'mp3') {
        const meta = parseId3(buffer);
        store.setMetadata(meta);
      } else if (headerInfo.format === 'flac') {
        const meta = parseFlacVorbisComments(buffer);
        store.setMetadata(meta);
      }
    } catch (e) {
      console.warn('Header parse failed:', e);
    }

    // Decode to PCM
    try {
      store.setDecoding(true);
      const pcm = await decodeAudio(buffer, (progress) => {
        store.setDecodeProgress(progress);
      });
      store.setPCM(pcm);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to decode audio';
      store.setDecodeError(message);
      console.error('Decode failed:', e);
    }
  }, [store]);

  const clear = useCallback(() => {
    store.clear();
  }, [store]);

  return {
    loadFile,
    clear,
    file: store.file,
    fileName: store.fileName,
    fileSize: store.fileSize,
    headerInfo: store.headerInfo,
    metadata: store.metadata,
    pcm: store.pcm,
    decoding: store.decoding,
    decodeProgress: store.decodeProgress,
    decodeError: store.decodeError,
  };
}
