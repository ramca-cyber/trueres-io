import { useCallback, useEffect } from 'react';
import { useFFmpegStore } from '@/stores/ffmpeg-store';
import { getFFmpeg, processFile, isFFmpegLoaded, cancelProcessing } from '@/engines/processing/ffmpeg-manager';
import { toast } from '@/hooks/use-toast';

/**
 * Hook for ffmpeg.wasm processing operations
 */
export function useFFmpeg() {
  const store = useFFmpegStore();

  // Warn before leaving during active conversion
  useEffect(() => {
    if (!store.processing) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [store.processing]);

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

      // Best-effort memory pressure warning (Chrome only)
      const deviceMem = (navigator as any).deviceMemory as number | undefined;
      if (deviceMem) {
        const estimatedBytes = inputFile.size * 3;
        const deviceBytes = deviceMem * 1024 * 1024 * 1024;
        if (estimatedBytes > deviceBytes * 0.7) {
          toast({
            title: 'High memory usage expected',
            description: `This file may use up to ${Math.round(estimatedBytes / (1024 * 1024))}MB of memory. Close other tabs for best results.`,
          });
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
        // Don't show error if cancelled — read directly from store to avoid stale closure
        if (useFFmpegStore.getState().cancelled) return null;
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
