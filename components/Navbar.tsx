'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  TrendingUp, BarChart2, FileText, Landmark, HandCoins, PiggyBank, Receipt,
  RefreshCw, GitCompare, Flame, CalendarCheck, Activity, Heart, Sparkles,
  Repeat, Zap, Menu, X, LogOut, User, Shield, Coins, Settings,
  PanelLeftClose, PanelLeftOpen,
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
      { href: '/bond-payouts', label: 'Bond Payouts', icon: Coins },
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

const SETTINGS_LINK = { href: '/settings', label: 'Settings', icon: Settings };

const allLinks = [...navGroups.flatMap((g) => g.links), SETTINGS_LINK];

// Shown only to the owner — see /api/admin/users
const OWNER_LINK = { href: '/admin', label: 'Admin', icon: Shield };

export default function Navbar() {
  const pathname = usePathname();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const { sidebarMode, sidebarExpanded } = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [me, setMe] = useState<{ user: string | null; authEnabled: boolean; isOwner?: boolean } | null>(null);

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

  // Icons-only rail at lg+ (the mobile drawer always shows labels)
  const collapsed =
    sidebarMode === 'pinned' ? false
    : sidebarMode === 'hover' ? !hovering
    : !sidebarExpanded;
  // Hides an element on the desktop rail only
  const railHidden = collapsed && 'lg:hidden';

  const themeToggle = (
    <button
      onClick={() => setTheme(theme === 'classic' ? 'glass' : 'classic')}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all',
        collapsed && 'lg:px-2',
        theme === 'glass'
          ? 'border-indigo-500/50 bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30'
          : 'border-[#2a2d3e] bg-transparent text-slate-500 hover:border-slate-500 hover:text-slate-300'
      )}
      title="Switch UI theme"
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span className={cn(railHidden)}>{theme === 'glass' ? 'Glass' : 'Classic'}</span>
    </button>
  );

  const navLink = ({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Settings }) => {
    const isActive = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        title={collapsed ? label : undefined}
        className={cn(
          'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
          collapsed && 'lg:justify-center lg:px-0 lg:py-2',
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-slate-400 hover:bg-[#1a1d2e] hover:text-slate-200'
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span className={cn('truncate', railHidden)}>{label}</span>
      </Link>
    );
  };

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
        onMouseEnter={() => sidebarMode === 'hover' && setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-60 flex-col border-r border-[#2a2d3e] bg-[#12151f]',
          'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
          'transition-[transform,width] duration-200 ease-out lg:translate-x-0',
          collapsed ? 'lg:w-16' : 'lg:w-60',
          sidebarMode === 'hover' && hovering && 'lg:shadow-2xl lg:shadow-black/60',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className={cn(
          'flex h-12 flex-shrink-0 items-center gap-2 border-b border-[#2a2d3e] px-3 lg:h-14 lg:px-4',
          collapsed && 'lg:justify-center lg:px-0',
        )}>
          {/* Click mode keeps its one toggle up here: on the icon rail it replaces the logo */}
          <div className={cn(
            'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600',
            sidebarMode === 'click' && collapsed && 'lg:hidden',
          )}>
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <span className={cn('text-sm font-bold text-slate-100', railHidden)}>Portfolio</span>
          {sidebarMode === 'click' && (
            <button
              onClick={() => updateSettings({ sidebarExpanded: collapsed })}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className={cn(
                'hidden rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-[#1a1d2e] hover:text-slate-200 lg:block',
                !collapsed && '-mr-1 ml-auto',
              )}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation menu"
            className="-mr-1 ml-auto rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-[#1a1d2e] hover:text-slate-200 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
          {navGroups.map(({ title, links }, i) => (
            <div key={title} className="mb-1">
              <div className={cn('px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600', railHidden)}>
                {title}
              </div>
              {/* Group titles become a thin divider on the icon rail */}
              {collapsed && i > 0 && <div className="mx-2 my-1.5 hidden border-t border-[#2a2d3e] lg:block" />}
              {(title === 'Tools' && me?.isOwner ? [...links, OWNER_LINK] : links).map(navLink)}
            </div>
          ))}
        </div>

        <div className={cn('flex-shrink-0 space-y-2 border-t border-[#2a2d3e] p-3', collapsed && 'lg:px-2')}>
          {navLink(SETTINGS_LINK)}
          {me?.user && (
            <div className={cn(
              'flex items-center gap-2 rounded-lg bg-[#0f1117] px-2.5 py-2',
              collapsed && 'lg:justify-center lg:bg-transparent lg:px-0 lg:py-0',
            )}>
              <User className={cn('h-3.5 w-3.5 flex-shrink-0 text-slate-500', railHidden)} />
              <span className={cn('truncate text-xs font-medium capitalize text-slate-300', railHidden)}>{me.user}</span>
              <button
                onClick={async () => {
                  await fetch('/api/login', { method: 'DELETE' });
                  window.location.href = '/login';
                }}
                title={`Sign out${me.user ? ` (${me.user})` : ''}`}
                className="ml-auto rounded p-1 text-slate-500 transition-colors hover:bg-[#1a1d2e] hover:text-red-400"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className={cn('hidden lg:flex', collapsed && 'lg:justify-center')}>{themeToggle}</div>
        </div>
      </nav>
    </>
  );
}
