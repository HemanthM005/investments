'use client';

import { useAppStore } from '@/lib/appStore';
import { X } from 'lucide-react';

export default function SaveErrorBanner() {
  const { saveError, setSaveError } = useAppStore();

  if (!saveError) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border border-red-500/40 bg-red-950/90 px-4 py-3 text-sm text-red-300 shadow-lg backdrop-blur">
      <span className="flex-1">⚠ Save failed: {saveError}</span>
      <button
        onClick={() => setSaveError(null)}
        className="shrink-0 rounded p-0.5 hover:bg-red-900/60"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
