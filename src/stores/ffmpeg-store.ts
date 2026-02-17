import { create } from 'zustand';

interface FFmpegState {
  loaded: boolean;
  loading: boolean;
  loadError: string | null;
  processing: boolean;
  progress: number;
  processError: string | null;
  outputBlob: Blob | null;
  outputFileName: string;

  setLoaded: (loaded: boolean) => void;
  setLoading: (loading: boolean) => void;
  setLoadError: (error: string | null) => void;
  setProcessing: (processing: boolean) => void;
  setProgress: (progress: number) => void;
  setProcessError: (error: string | null) => void;
  setOutput: (blob: Blob, fileName: string) => void;
  clearOutput: () => void;
  reset: () => void;
}

const initialState = {
  loaded: false,
  loading: false,
  loadError: null,
  processing: false,
  progress: 0,
  processError: null,
  outputBlob: null,
  outputFileName: '',
};

export const useFFmpegStore = create<FFmpegState>((set) => ({
  ...initialState,

  setLoaded: (loaded) => set({ loaded, loading: false }),
  setLoading: (loading) => set({ loading }),
  setLoadError: (error) => set({ loadError: error, loading: false }),
  setProcessing: (processing) => set({ processing, progress: 0, processError: null }),
  setProgress: (progress) => set({ progress }),
  setProcessError: (error) => set({ processError: error, processing: false }),
  setOutput: (blob, fileName) => set({ outputBlob: blob, outputFileName: fileName, processing: false, progress: 100 }),
  clearOutput: () => set({ outputBlob: null, outputFileName: '', progress: 0, processError: null }),
  reset: () => set(initialState),
}));
