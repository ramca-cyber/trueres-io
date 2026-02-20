import { create } from 'zustand';
import { type QueueItem } from '@/components/shared/PlaylistPanel';

export type LoopMode = 'off' | 'one' | 'all';

interface PlaybackState {
  active: boolean;
  queue: QueueItem[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;

  shuffle: boolean;
  shuffleOrder: number[];
  loopMode: LoopMode;
  crossfadeSec: number;
  sleepMode: number;
  audioOnlyMode: boolean;
  showSpectrum: boolean;
  showSpectrogram: boolean;

  activate: (queue: QueueItem[], currentIndex: number) => void;
  deactivate: () => void;
  setPlaying: (playing: boolean) => void;
  setCurrentIndex: (index: number) => void;
  setTime: (currentTime: number, duration: number) => void;
  setQueue: (queue: QueueItem[]) => void;
  setShuffle: (shuffle: boolean) => void;
  setShuffleOrder: (order: number[]) => void;
  setLoopMode: (mode: LoopMode) => void;
  setCrossfadeSec: (sec: number) => void;
  setSleepMode: (mode: number) => void;
  setAudioOnlyMode: (on: boolean) => void;
  setShowSpectrum: (on: boolean) => void;
  setShowSpectrogram: (on: boolean) => void;
}

const INITIAL: Partial<PlaybackState> = {
  active: false,
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  shuffle: false,
  shuffleOrder: [],
  loopMode: 'off' as LoopMode,
  crossfadeSec: 0,
  sleepMode: 0,
  audioOnlyMode: false,
  showSpectrum: true,
  showSpectrogram: false,
};

export const useMiniPlayerStore = create<PlaybackState>((set) => ({
  ...(INITIAL as PlaybackState),

  activate: (queue, currentIndex) => set({ active: true, queue, currentIndex }),
  deactivate: () => set({ ...INITIAL }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  setTime: (currentTime, duration) => set({ currentTime, duration }),
  setQueue: (queue) => set({ queue }),
  setShuffle: (shuffle) => set({ shuffle }),
  setShuffleOrder: (shuffleOrder) => set({ shuffleOrder }),
  setLoopMode: (loopMode) => set({ loopMode }),
  setCrossfadeSec: (crossfadeSec) => set({ crossfadeSec }),
  setSleepMode: (sleepMode) => set({ sleepMode }),
  setAudioOnlyMode: (audioOnlyMode) => set({ audioOnlyMode }),
  setShowSpectrum: (showSpectrum) => set({ showSpectrum }),
  setShowSpectrogram: (showSpectrogram) => set({ showSpectrogram }),
}));
