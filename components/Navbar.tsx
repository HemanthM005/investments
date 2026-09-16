'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  TrendingUp, BarChart2, FileText, Landmark, HandCoins, PiggyBank, Receipt,
  RefreshCw, GitCompare, Flame, CalendarCheck, Activity, Heart, Sparkles,
  Repeat, Zap, Menu, X, LogOut, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/appStore';

const navGroups = [
  {
    title: 'Overview',
    links: [
      { href: '/', label: 'Dashboard', icon: BarChart2 },
      { href: '/compare', label: 'Compare', icon: GitCompare },
    ],
  },
  {
    title: 'Investments',
    links: [
      { href: '/investments', label: 'My Investments', icon: TrendingUp },
      { href: '/sips', label: 'SIPs', icon: Repeat },
    ],
  },
  {
    title: 'Spending',
    links: [
      { href: '/expenses', label: 'Daily Expenses', icon: Receipt },
      { href: '/subscriptions', label: 'Subscriptions', icon: RefreshCw },
      { href: '/for-others', label: 'For Others', icon: Heart },
    ],
  },
  {
    title: 'Money',
    links: [
      { href: '/money-tracker', label: 'Money Tracker', icon: HandCoins },
      { href: '/cash-accounts', label: 'Cash & Accounts', icon: PiggyBank },
    ],
  },
  {
    title: 'Daily',
    links: [
      { href: '/habit-tracker', label: 'Habit Tracker', icon: Flame },
      { href: '/planner', label: 'Daily Planner', icon: CalendarCheck },
    ],
  },
  {
    title: 'Tools',
    links: [
      { href: '/message-parser', label: 'Message Parser', icon: Zap },
      { href: '/ai-usage', label: 'AI Usage', icon: Activity },
    ],
  },
  {
    title: 'Research',
    links: [
      { href: '/india-sectors-report', label: 'India Sectors', icon: FileText },
      { href: '/invest-3-lakhs-plan', label: 'Invest ₹3L Plan', icon: Landmark },
    ],
  },
];

const allLinks = navGroups.flatMap((g) => g.links);

export default function Navbar() {
  const pathname = usePathname();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<{ user: string | null; authEnabled: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then(setMe)
      .catch(() => {});
  }, []);

  // Close the drawer on navigation
  useEffect(() => setOpen(false), [pathname]);

  // While the drawer is open: lock body scroll, close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = allLinks.find((l) => l.href === pathname);

  const themeToggle = (
    <button
      onClick={() => setTheme(theme === 'classic' ? 'glass' : 'classic')}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all',
        theme === 'glass'
          ? 'border-indigo-500/50 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30'
          : 'border-[#2a2d3e] bg-transparent text-slate-500 hover:border-slate-500 hover:text-slate-300'
      )}
      title="Switch UI theme"
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span>{theme === 'glass' ? 'Glass' : 'Classic'}</span>
    </button>
  );

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-[calc(3rem+env(safe-area-inset-top))] items-center gap-2 border-b border-[#2a2d3e] bg-[#12151f] px-3 pt-[env(safe-area-inset-top)] lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="-ml-1 rounded-lg p-2 text-slate-400 transition-colors hover:bg-[#1a1d2e] hover:text-slate-200"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="truncate text-sm font-semibold text-slate-100">
          {current?.label ?? 'Portfolio'}
        </span>
        <div className="ml-auto flex-shrink-0">{themeToggle}</div>
      </header>

      {/* ── Drawer backdrop (mobile only) ──────────────────── */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className={cn(
          'fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      />

      {/* ── Sidebar: drawer under lg, permanent at lg+ ─────── */}
      <nav
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-60 flex-col border-r border-[#2a2d3e] bg-[#12151f]',
          'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
          'transition-transform duration-200 ease-out lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-12 flex-shrink-0 items-center gap-2 border-b border-[#2a2d3e] px-3 lg:h-14 lg:px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-slate-100">Portfolio</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="-mr-1 ml-auto rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-[#1a1d2e] hover:text-slate-200 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {navGroups.map(({ title, links }) => (
            <div key={title} className="mb-1">
              <div className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                {title}
              </div>
              {links.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:bg-[#1a1d2e] hover:text-slate-200'
                    )}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex-shrink-0 border-t border-[#2a2d3e] p-3">
          {me?.user && (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-[#0f1117] px-2.5 py-2">
              <User className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
              <span className="truncate text-xs font-medium capitalize text-slate-300">{me.user}</span>
              <button
                onClick={async () => {
                  await fetch('/api/login', { method: 'DELETE' });
                  window.location.href = '/login';
                }}
                title="Sign out"
                className="ml-auto rounded p-1 text-slate-500 transition-colors hover:bg-[#1a1d2e] hover:text-red-400"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="hidden lg:block">{themeToggle}</div>
        </div>
      </nav>
    </>
  );
}
