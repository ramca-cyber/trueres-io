import { create } from 'zustand';

interface FileTransferState {
  pendingFile: File | null;
  setPendingFile: (file: File | null) => void;
  consumePendingFile: () => File | null;
}

export const useFileTransferStore = create<FileTransferState>((set, get) => ({
  pendingFile: null,
  setPendingFile: (file) => set({ pendingFile: file }),
  consumePendingFile: () => {
    const file = get().pendingFile;
    if (file) set({ pendingFile: null });
    return file;
  },
}));
