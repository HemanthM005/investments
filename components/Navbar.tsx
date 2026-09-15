'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, BarChart2, FileText, Landmark, HandCoins, PiggyBank, Receipt, RefreshCw, GitCompare, Flame, CalendarCheck, Activity, Heart, Sparkles, Repeat, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/appStore';

const navLinks = [
  { href: '/', label: 'Dashboard', icon: BarChart2 },
  { href: '/investments', label: 'My Investments', icon: TrendingUp },
  { href: '/expenses', label: 'Daily Expenses', icon: Receipt },
  { href: '/for-others', label: 'For Others', icon: Heart },
  { href: '/subscriptions', label: 'Subscriptions', icon: RefreshCw },
  { href: '/sips', label: 'SIPs', icon: Repeat },
  { href: '/money-tracker', label: 'Money Tracker', icon: HandCoins },
  { href: '/cash-accounts', label: 'Cash & Accounts', icon: PiggyBank },
  { href: '/message-parser', label: 'Message Parser', icon: Zap },
  { href: '/habit-tracker', label: 'Habit Tracker', icon: Flame },
  { href: '/planner', label: 'Daily Planner', icon: CalendarCheck },
  { href: '/india-sectors-report', label: 'India Sectors Report', icon: FileText },
  { href: '/invest-3-lakhs-plan', label: 'Invest ₹3L Plan', icon: Landmark },
  { href: '/compare', label: 'Compare', icon: GitCompare },
  { href: '/ai-usage', label: 'AI Usage', icon: Activity },
];

export default function Navbar() {
  const pathname = usePathname();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  return (
    <nav className="sticky top-0 z-50 border-b border-[#2a2d3e] bg-[#12151f]">
      <div className="mx-auto flex max-w-[1400px] items-center gap-1 px-4 py-3">
        <div className="flex items-center gap-2 mr-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-slate-100 text-base hidden sm:block">Portfolio</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-[#1a1d2e] hover:text-slate-200'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>
        <div className="ml-auto flex-shrink-0">
          <button
            onClick={() => setTheme(theme === 'classic' ? 'glass' : 'classic')}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all border',
              theme === 'glass'
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/30'
                : 'bg-transparent border-[#2a2d3e] text-slate-500 hover:text-slate-300 hover:border-slate-500'
            )}
            title="Switch UI theme"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{theme === 'glass' ? 'Glass' : 'Classic'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
