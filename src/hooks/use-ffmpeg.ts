import { useCallback } from 'react';
import { useFFmpegStore } from '@/stores/ffmpeg-store';
import { getFFmpeg, processFile, isFFmpegLoaded, cancelProcessing } from '@/engines/processing/ffmpeg-manager';

/**
 * Hook for ffmpeg.wasm processing operations
 */
export function useFFmpeg() {
  const store = useFFmpegStore();

  const load = useCallback(async () => {
    if (isFFmpegLoaded()) {
      store.setLoaded(true);
      return;
    }
    store.setLoading(true);
    try {
      await getFFmpeg();
      store.setLoaded(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load processing engine';
      store.setLoadError(msg);
    }
  }, [store]);

  const cancel = useCallback(() => {
    cancelProcessing();
    store.setCancelled(true);
  }, [store]);

  const process = useCallback(
    async (
      inputFile: File,
      inputName: string,
      outputName: string,
      args: string[],
    ): Promise<Blob | null> => {
      if (store.processing) {
        store.setProcessError('Another processing task is already running');
        return null;
      }

      // Auto-load if needed
      if (!isFFmpegLoaded()) {
        store.setLoading(true);
        try {
          await getFFmpeg();
          store.setLoaded(true);
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Failed to load processing engine';
          store.setLoadError(msg);
          return null;
        }
      }

      store.setProcessing(true);
      store.clearOutput();

      try {
        const blob = await processFile(inputFile, inputName, outputName, args, (p) => {
          store.setProgress(p);
        });
        store.setOutput(blob, outputName);
        return blob;
      } catch (e) {
        // Don't show error if cancelled
        if (store.cancelled) return null;
        const msg = e instanceof Error ? e.message : 'Processing failed';
        store.setProcessError(msg);
        return null;
      }
    },
    [store]
  );

  return {
    load,
    process,
    cancel,
    loaded: store.loaded,
    loading: store.loading,
    loadError: store.loadError,
    processing: store.processing,
    progress: store.progress,
    processError: store.processError,
    cancelled: store.cancelled,
    outputBlob: store.outputBlob,
    outputFileName: store.outputFileName,
    clearOutput: store.clearOutput,
    reset: store.reset,
  };
}
