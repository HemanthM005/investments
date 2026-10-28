'use client';

import { create } from 'zustand';

type Theme = 'classic' | 'glass';

// Desktop sidebar behaviour (below lg the sidebar is always a slide-in drawer):
//   click  — icons only; a toggle button expands/collapses it (pushes content)
//   hover  — icons only; expands over the content while hovered
//   pinned — always fully expanded
export type SidebarMode = 'click' | 'hover' | 'pinned';

export interface UiSettings {
  sidebarMode: SidebarMode;
  sidebarExpanded: boolean;  // click mode only — remembered open/closed state
  bondAutoCredit: boolean;   // credit due bond payouts to their account on app load
}

const SETTINGS_KEY = 'ui-settings';

const DEFAULT_SETTINGS: UiSettings = {
  sidebarMode: 'click',
  sidebarExpanded: false,
  bondAutoCredit: true,
};

interface AppStore {
  saveError: string | null;
  setSaveError: (msg: string | null) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  settings: UiSettings;
  settingsLoaded: boolean;
  loadSettings: () => void;
  updateSettings: (patch: Partial<UiSettings>) => void;
}

export const useAppStore = create<AppStore>()((set, get) => ({
  saveError: null,
  setSaveError: (msg) => set({ saveError: msg }),
  theme: 'classic',
  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== 'undefined') localStorage.setItem('ui-theme', theme);
  },
  settings: DEFAULT_SETTINGS,
  settingsLoaded: false,
  loadSettings: () => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const saved = raw ? (JSON.parse(raw) as Partial<UiSettings>) : {};
      set({ settings: { ...DEFAULT_SETTINGS, ...saved }, settingsLoaded: true });
    } catch {
      set({ settingsLoaded: true });
    }
  },
  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch { /* storage unavailable — keep in memory */ }
  },
}));
