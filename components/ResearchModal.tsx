'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronRight, TrendingUp, AlertTriangle, BarChart2, Users, ShieldCheck, Briefcase, DollarSign, Target, BookOpen, Info, Gavel } from 'lucide-react';
import type { Investment } from '@/lib/types';

interface Props {
  investment: Investment | null;
  onClose: () => void;
}

// Section metadata: colour + icon
const SECTION_META: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  'Executive Summary':           { color: 'text-indigo-300',  bg: 'bg-indigo-900/20 border-indigo-800/40',   icon: <BookOpen className="h-4 w-4" /> },
  'Company Overview':            { color: 'text-sky-300',     bg: 'bg-sky-900/20 border-sky-800/40',         icon: <Info className="h-4 w-4" /> },
  'Market Data':                 { color: 'text-violet-300',  bg: 'bg-violet-900/20 border-violet-800/40',   icon: <BarChart2 className="h-4 w-4" /> },
  'Recent Financials':           { color: 'text-emerald-300', bg: 'bg-emerald-900/20 border-emerald-800/40', icon: <TrendingUp className="h-4 w-4" /> },
  'Key Orders & Partnerships':   { color: 'text-cyan-300',    bg: 'bg-cyan-900/20 border-cyan-800/40',       icon: <Briefcase className="h-4 w-4" /> },
  'Clients & Partnerships':      { color: 'text-cyan-300',    bg: 'bg-cyan-900/20 border-cyan-800/40',       icon: <Users className="h-4 w-4" /> },
  'Competitive Position & Moat': { color: 'text-amber-300',   bg: 'bg-amber-900/20 border-amber-800/40',    icon: <ShieldCheck className="h-4 w-4" /> },
  'Management & Ownership':      { color: 'text-teal-300',    bg: 'bg-teal-900/20 border-teal-800/40',       icon: <Users className="h-4 w-4" /> },
  'Valuation Metrics':           { color: 'text-yellow-300',  bg: 'bg-yellow-900/20 border-yellow-800/40',  icon: <DollarSign className="h-4 w-4" /> },
  'Analyst Coverage & Targets':  { color: 'text-purple-300',  bg: 'bg-purple-900/20 border-purple-800/40',  icon: <Target className="h-4 w-4" /> },
  'Risks':                       { color: 'text-red-300',     bg: 'bg-red-900/20 border-red-800/40',         icon: <AlertTriangle className="h-4 w-4" /> },
  'Financial Snapshot':          { color: 'text-emerald-300', bg: 'bg-emerald-900/20 border-emerald-800/40', icon: <BarChart2 className="h-4 w-4" /> },
  'Final Verdict':               { color: 'text-fuchsia-300', bg: 'bg-fuchsia-900/20 border-fuchsia-800/40', icon: <Gavel className="h-4 w-4" /> },
};

const DEFAULT_META = { color: 'text-slate-300', bg: 'bg-slate-800/30 border-slate-700/40', icon: <Info className="h-4 w-4" /> };

interface Section {
  title: string;
  lines: string[];
}

function parseResearch(text: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    // Bold heading: **Title**
    const headingMatch = line.match(/^\*\*(.+)\*\*$/);
    if (headingMatch) {
      if (current) sections.push(current);
      current = { title: headingMatch[1], lines: [] };
    } else if (current) {
      if (line) current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

// Parse Financial Snapshot bullets into key-value metric cards
function parseSnapshotMetric(line: string): { label: string; value: string } | null {
  const noLeadingDash = line.replace(/^-\s*/, '');
  const colonIdx = noLeadingDash.indexOf(':');
  if (colonIdx === -1) return null;
  return {
    label: noLeadingDash.slice(0, colonIdx).trim(),
    value: noLeadingDash.slice(colonIdx + 1).trim(),
  };
}

function FinancialSnapshotCards({ lines }: { lines: string[] }) {
  const metrics = lines
    .filter((l) => l.startsWith('-'))
    .map(parseSnapshotMetric)
    .filter(Boolean) as { label: string; value: string }[];

  if (metrics.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
      {metrics.map((m) => (
        <div key={m.label} className="rounded-lg border border-emerald-800/30 bg-emerald-950/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-emerald-500 mb-0.5">{m.label}</p>
          <p className="text-sm font-medium text-slate-100 leading-snug">{m.value}</p>
        </div>
      ))}
    </div>
  );
}

function RenderLines({ lines, isRisk }: { lines: string[]; isRisk?: boolean }) {
  return (
    <div className="space-y-1.5 mt-2">
      {lines.map((line, i) => {
        if (line.startsWith('-')) {
          const content = line.slice(1).trim();
          return (
            <div key={i} className="flex items-start gap-2">
              <ChevronRight className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${isRisk ? 'text-red-400' : 'text-indigo-400'}`} />
              <span className={`text-sm leading-relaxed ${isRisk ? 'text-red-200/80' : 'text-slate-300'}`}>{content}</span>
            </div>
          );
        }
        return (
          <p key={i} className="text-sm leading-relaxed text-slate-300">{line}</p>
        );
      })}
    </div>
  );
}

export default function ResearchModal({ investment, onClose }: Props) {
  if (!investment) return null;
  const sections = parseResearch(investment.research ?? '');

  return (
    <Dialog open={!!investment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-100">
            <span className="text-lg">{investment.asset_name}</span>
            <span className="text-xs font-normal text-slate-500 bg-[#1a1d2e] border border-[#2a2d3e] rounded-full px-2 py-0.5">
              {investment.sector}
            </span>
            {investment.ticker && (
              <span className="text-xs font-normal text-indigo-400">{investment.ticker}</span>
            )}
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-0.5">Deep-dive research note</p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {sections.length === 0 && (
            <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 p-6 text-center text-slate-500">
              <Info className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No research notes yet.</p>
              <p className="text-xs mt-1">Add a <code className="text-slate-400">research</code> field to this entry in <code className="text-slate-400">portfolio.json</code>.</p>
            </div>
          )}
          {sections.map((section) => {
            const meta = SECTION_META[section.title] ?? DEFAULT_META;
            const isFinancialSnapshot = section.title === 'Financial Snapshot';
            const isRisk = section.title === 'Risks';

            return (
              <div key={section.title} className={`rounded-lg border p-4 ${meta.bg}`}>
                <div className={`flex items-center gap-2 mb-2 font-semibold text-sm ${meta.color}`}>
                  {meta.icon}
                  {section.title}
                </div>
                {isFinancialSnapshot ? (
                  <FinancialSnapshotCards lines={section.lines} />
                ) : (
                  <RenderLines lines={section.lines} isRisk={isRisk} />
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-slate-600 mt-2 text-center">
          Research note · Last updated {investment.purchase_date} · Not investment advice
        </p>
      </DialogContent>
    </Dialog>
  );
}
