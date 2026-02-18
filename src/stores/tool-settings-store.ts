import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ToolSettingsState {
  settings: Record<string, Record<string, any>>;
  getSettings: (toolId: string) => Record<string, any> | undefined;
  setSettings: (toolId: string, values: Record<string, any>) => void;
  clearSettings: (toolId: string) => void;
}

export const useToolSettingsStore = create<ToolSettingsState>()(
  persist(
    (set, get) => ({
      settings: {},
      getSettings: (toolId) => get().settings[toolId],
      setSettings: (toolId, values) =>
        set((state) => ({
          settings: { ...state.settings, [toolId]: { ...state.settings[toolId], ...values } },
        })),
      clearSettings: (toolId) =>
        set((state) => {
          const { [toolId]: _, ...rest } = state.settings;
          return { settings: rest };
        }),
    }),
    { name: 'tool-settings' }
  )
);
