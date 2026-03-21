'use client';

import { create } from 'zustand';

interface AppStore {
  saveError: string | null;
  setSaveError: (msg: string | null) => void;
}

export const useAppStore = create<AppStore>()((set) => ({
  saveError: null,
  setSaveError: (msg) => set({ saveError: msg }),
}));
