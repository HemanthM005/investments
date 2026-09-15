'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/appStore';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  // Load persisted theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('ui-theme') as 'classic' | 'glass' | null;
    if (saved && saved !== theme) setTheme(saved);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply data-theme attribute to body whenever theme changes
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  return <>{children}</>;
}
