import { create } from 'zustand';
import { type AudioFileInfo, type PCMData, type AudioMetadata, type HeaderParseResult } from '@/types/audio';
import { type AnalysisResult } from '@/types/analysis';

interface AudioState {
  // File
  file: File | null;
  fileName: string;
  fileSize: number;
  arrayBuffer: ArrayBuffer | null;

  // Parsed header info (instant, no decode)
  headerInfo: HeaderParseResult | null;
  metadata: AudioMetadata | null;

  // Decoded PCM (expensive, cached)
  pcm: PCMData | null;
  decoding: boolean;
  decodeProgress: number;
  decodeError: string | null;

  // Analysis cache
  analyses: Map<string, AnalysisResult>;
  analyzingKeys: Set<string>;

  // Actions
  setFile: (file: File, buffer: ArrayBuffer) => void;
  setHeaderInfo: (info: HeaderParseResult) => void;
  setMetadata: (meta: AudioMetadata) => void;
  setPCM: (pcm: PCMData) => void;
  setDecoding: (decoding: boolean) => void;
  setDecodeProgress: (progress: number) => void;
  setDecodeError: (error: string | null) => void;
  cacheAnalysis: (key: string, result: AnalysisResult) => void;
  getAnalysis: <T extends AnalysisResult>(key: string) => T | undefined;
  isAnalysisCached: (key: string) => boolean;
  setAnalyzing: (key: string, analyzing: boolean) => void;
  isAnalyzing: (key: string) => boolean;
  clear: () => void;
}

const initialState = {
  file: null,
  fileName: '',
  fileSize: 0,
  arrayBuffer: null,
  headerInfo: null,
  metadata: null,
  pcm: null,
  decoding: false,
  decodeProgress: 0,
  decodeError: null,
  analyses: new Map<string, AnalysisResult>(),
  analyzingKeys: new Set<string>(),
};

export const useAudioStore = create<AudioState>((set, get) => ({
  ...initialState,

  setFile: (file, buffer) =>
    set({
      file,
      fileName: file.name,
      fileSize: file.size,
      arrayBuffer: buffer,
      // Clear previous state
      headerInfo: null,
      metadata: null,
      pcm: null,
      decoding: false,
      decodeProgress: 0,
      decodeError: null,
      analyses: new Map(),
      analyzingKeys: new Set(),
    }),

  setHeaderInfo: (info) => set({ headerInfo: info }),
  setMetadata: (meta) => set({ metadata: meta }),
  setPCM: (pcm) => set({ pcm, decoding: false, decodeProgress: 100 }),
  setDecoding: (decoding) => set({ decoding }),
  setDecodeProgress: (progress) => set({ decodeProgress: progress }),
  setDecodeError: (error) => set({ decodeError: error, decoding: false }),

  cacheAnalysis: (key, result) =>
    set((state) => {
      const analyses = new Map(state.analyses);
      analyses.set(key, result);
      const analyzingKeys = new Set(state.analyzingKeys);
      analyzingKeys.delete(key);
      return { analyses, analyzingKeys };
    }),

  getAnalysis: <T extends AnalysisResult>(key: string) =>
    get().analyses.get(key) as T | undefined,

  isAnalysisCached: (key) => get().analyses.has(key),

  setAnalyzing: (key, analyzing) =>
    set((state) => {
      const analyzingKeys = new Set(state.analyzingKeys);
      if (analyzing) analyzingKeys.add(key);
      else analyzingKeys.delete(key);
      return { analyzingKeys };
    }),

  isAnalyzing: (key) => get().analyzingKeys.has(key),

  clear: () => set(initialState),
}));
