import { useState, useCallback, useRef } from 'react';
import { getFFmpeg, processFile } from '@/engines/processing/ffmpeg-manager';

export type BatchItemStatus = 'pending' | 'processing' | 'done' | 'error';

export interface BatchItem {
  file: File;
  status: BatchItemStatus;
  progress: number;
  outputBlob: Blob | null;
  outputName: string;
  error: string | null;
}

export interface BatchJob {
  inputName: string;
  outputName: string;
  args: string[];
}

export function useBatchProcess() {
  const [queue, setQueue] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [engineLoading, setEngineLoading] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const abortRef = useRef(false);
  const queueRef = useRef<BatchItem[]>([]);
  queueRef.current = queue;

  const addFiles = useCallback((files: File[]) => {
    setQueue(prev => [
      ...prev,
      ...files.map(file => ({
        file,
        status: 'pending' as BatchItemStatus,
        progress: 0,
        outputBlob: null,
        outputName: '',
        error: null,
      })),
    ]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setIsProcessing(false);
    setEngineError(null);
    abortRef.current = true;
  }, []);

  const startProcessing = useCallback(async (
    buildJob: (file: File) => BatchJob,
  ) => {
    if (isProcessing) return;
    abortRef.current = false;
    setIsProcessing(true);
    setEngineError(null);

    // Load engine first
    setEngineLoading(true);
    try {
      await getFFmpeg();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load processing engine';
      setEngineError(msg);
      setEngineLoading(false);
      setIsProcessing(false);
      return;
    }
    setEngineLoading(false);

    // Process files sequentially — read queueRef so files added during processing are included
    for (let i = 0; i < queueRef.current.length; i++) {
      if (abortRef.current) break;
      if (queueRef.current[i].status === 'done') continue;

      const item = queueRef.current[i];
      const job = buildJob(item.file);

      setQueue(prev => prev.map((it, idx) =>
        idx === i ? { ...it, status: 'processing' as BatchItemStatus, progress: 0, error: null, outputName: job.outputName } : it
      ));

      try {
        const blob = await processFile(
          item.file,
          job.inputName,
          job.outputName,
          job.args,
          (p) => {
            setQueue(prev => prev.map((it, idx) =>
              idx === i ? { ...it, progress: p } : it
            ));
          },
        );

        setQueue(prev => prev.map((it, idx) =>
          idx === i ? { ...it, status: 'done' as BatchItemStatus, progress: 100, outputBlob: blob } : it
        ));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Processing failed';
        setQueue(prev => prev.map((it, idx) =>
          idx === i ? { ...it, status: 'error' as BatchItemStatus, error: msg } : it
        ));
      }
    }

    setIsProcessing(false);
  }, [isProcessing]);

  const retryItem = useCallback(async (index: number, buildJob: (file: File) => BatchJob) => {
    const item = queue[index];
    if (!item || item.status !== 'error') return;

    const job = buildJob(item.file);

    setQueue(prev => prev.map((it, idx) =>
      idx === index ? { ...it, status: 'processing' as BatchItemStatus, progress: 0, error: null, outputName: job.outputName } : it
    ));

    try {
      const blob = await processFile(
        item.file,
        job.inputName,
        job.outputName,
        job.args,
        (p) => {
          setQueue(prev => prev.map((it, idx) =>
            idx === index ? { ...it, progress: p } : it
          ));
        },
      );

      setQueue(prev => prev.map((it, idx) =>
        idx === index ? { ...it, status: 'done' as BatchItemStatus, progress: 100, outputBlob: blob } : it
      ));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Processing failed';
      setQueue(prev => prev.map((it, idx) =>
        idx === index ? { ...it, status: 'error' as BatchItemStatus, error: msg } : it
      ));
    }
  }, [queue]);

  const downloadAll = useCallback(() => {
    const doneItems = queue.filter(it => it.status === 'done' && it.outputBlob);
    doneItems.forEach((item, i) => {
      setTimeout(() => {
        const url = URL.createObjectURL(item.outputBlob!);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.outputName;
        a.click();
        URL.revokeObjectURL(url);
      }, i * 200);
    });
  }, [queue]);

  const doneCount = queue.filter(it => it.status === 'done').length;
  const allDone = queue.length > 0 && doneCount === queue.length;

  return {
    queue,
    addFiles,
    removeFile,
    clearQueue,
    startProcessing,
    retryItem,
    downloadAll,
    isProcessing,
    engineLoading,
    engineError,
    doneCount,
    allDone,
  };
}
