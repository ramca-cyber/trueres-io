import { create } from 'zustand';
import { type QueueItem } from '@/components/shared/PlaylistPanel';

interface MiniPlayerState {
  active: boolean;
  queue: QueueItem[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  
  activate: (queue: QueueItem[], currentIndex: number) => void;
  deactivate: () => void;
  setPlaying: (playing: boolean) => void;
  setCurrentIndex: (index: number) => void;
  setTime: (currentTime: number, duration: number) => void;
  setQueue: (queue: QueueItem[]) => void;
}

export const useMiniPlayerStore = create<MiniPlayerState>((set) => ({
  active: false,
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,

  activate: (queue, currentIndex) => set({ active: true, queue, currentIndex }),
  deactivate: () => set({ active: false, queue: [], currentIndex: 0, isPlaying: false, currentTime: 0, duration: 0 }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  setTime: (currentTime, duration) => set({ currentTime, duration }),
  setQueue: (queue) => set({ queue }),
}));
