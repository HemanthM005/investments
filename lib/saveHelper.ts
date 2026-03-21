'use client';

import { useAppStore } from './appStore';

type SectionName = 'investments' | 'money_records' | 'accounts' | 'expenses' | 'recurring';

function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

// Save a single section
export async function saveSection(section: SectionName, data: unknown[], action?: string) {
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section, data, action }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error ?? 'Save failed');
    useAppStore.getState().setSaveError(null);
  } catch (e) {
    if (isAbortError(e)) return; // navigating away — not an error
    const msg = `Failed to save ${section}: ${String(e)}`;
    console.warn(msg); // warn not error — prevents Next.js dev overlay
    useAppStore.getState().setSaveError(msg);
  }
}

// Save multiple sections atomically in ONE file write
export async function saveSections(
  sections: Partial<Record<SectionName, unknown[]>>,
  action?: string,
) {
  try {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections, action }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error ?? 'Save failed');
    useAppStore.getState().setSaveError(null);
  } catch (e) {
    if (isAbortError(e)) return;
    const msg = `Failed to save: ${String(e)}`;
    console.warn(msg);
    useAppStore.getState().setSaveError(msg);
  }
}
