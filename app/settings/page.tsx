'use client';

import { Settings, PanelLeft, MousePointerClick, Pin, Sparkles, Coins } from 'lucide-react';
import { useAppStore, type SidebarMode } from '@/lib/appStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const SIDEBAR_OPTIONS: { value: SidebarMode; label: string; desc: string; icon: typeof Pin }[] = [
  { value: 'click', label: 'Click to expand', desc: 'Icons only. Use the panel button at the bottom of the sidebar to show labels.', icon: PanelLeft },
  { value: 'hover', label: 'Expand on hover', desc: 'Icons only. Hover over the sidebar to see labels — it slides over the page.', icon: MousePointerClick },
  { value: 'pinned', label: 'Always expanded', desc: 'Sidebar always shows icons with labels.', icon: Pin },
];

function OptionButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
        active
          ? 'border-indigo-500 bg-indigo-950/30'
          : 'border-[#2a2d3e] hover:bg-white/[0.03]',
      )}
    >
      {children}
    </button>
  );
}

export default function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  return (
    <div className="max-w-[800px] mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="h-6 w-6 text-indigo-400" /> Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Display preferences — saved on this device
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Sidebar</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {SIDEBAR_OPTIONS.map(({ value, label, desc, icon: Icon }) => (
            <OptionButton
              key={value}
              active={settings.sidebarMode === value}
              onClick={() => updateSettings({ sidebarMode: value })}
            >
              <Icon className={cn('mt-0.5 h-4 w-4 flex-shrink-0', settings.sidebarMode === value ? 'text-indigo-400' : 'text-slate-500')} />
              <div>
                <p className="text-sm font-medium text-slate-100">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            </OptionButton>
          ))}
          <p className="pt-1 text-xs text-slate-600">On phones and small screens the sidebar always opens as a full menu.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Theme</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {(['classic', 'glass'] as const).map((t) => (
            <OptionButton key={t} active={theme === t} onClick={() => setTheme(t)}>
              <Sparkles className={cn('mt-0.5 h-4 w-4 flex-shrink-0', theme === t ? 'text-indigo-400' : 'text-slate-500')} />
              <p className="text-sm font-medium capitalize text-slate-100">{t}</p>
            </OptionButton>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Bonds</CardTitle></CardHeader>
        <CardContent>
          <OptionButton
            active={settings.bondAutoCredit}
            onClick={() => updateSettings({ bondAutoCredit: !settings.bondAutoCredit })}
          >
            <Coins className={cn('mt-0.5 h-4 w-4 flex-shrink-0', settings.bondAutoCredit ? 'text-indigo-400' : 'text-slate-500')} />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-100">Auto-credit bond payouts</p>
              <p className="text-xs text-slate-500">
                When interest or principal falls due, credit it to the bond&apos;s payout account automatically.
                When off, due payouts wait on the Bond Payouts page for you to confirm.
              </p>
            </div>
            <span className={cn(
              'mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
              settings.bondAutoCredit ? 'bg-emerald-900/40 text-emerald-300' : 'bg-slate-700 text-slate-400',
            )}>
              {settings.bondAutoCredit ? 'On' : 'Off'}
            </span>
          </OptionButton>
        </CardContent>
      </Card>
    </div>
  );
}
