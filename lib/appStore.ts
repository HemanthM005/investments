'use client';

import { create } from 'zustand';

type Theme = 'classic' | 'glass';

interface AppStore {
  saveError: string | null;
  setSaveError: (msg: string | null) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const useAppStore = create<AppStore>()((set) => ({
  saveError: null,
  setSaveError: (msg) => set({ saveError: msg }),
  theme: 'classic',
  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== 'undefined') localStorage.setItem('ui-theme', theme);
  },
}));
