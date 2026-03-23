'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { StockFundamentals } from '@/app/api/stock-analysis/route';

interface CompanyData {
  name: string;
  ticker: string;
  fundamentals: StockFundamentals;
}

interface Props {
  companies: CompanyData[];
}

// The 6 axes — lowerIsBetter means a lower raw value is inverted so "outward = better" on all axes
const AXES: { key: keyof StockFundamentals; label: string; lowerIsBetter: boolean }[] = [
  { key: 'eps',               label: 'EPS',           lowerIsBetter: false },
  { key: 'totalRevenue',      label: 'Revenue',       lowerIsBetter: false },
  { key: 'dividendYield',     label: 'Dividend',      lowerIsBetter: false },
  { key: 'peRatio',           label: 'P/E (lower=better)', lowerIsBetter: true  },
  { key: 'beta',              label: 'Beta (lower=better)', lowerIsBetter: true  },
  { key: 'recommendationMean', label: 'Analyst (lower=better)', lowerIsBetter: true  },
];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

const customTooltipStyle = {
  backgroundColor: '#1a1d2e',
  border: '1px solid #2a2d3e',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '12px',
};

export default function CompareRadarChart({ companies }: Props) {
  if (companies.length < 2) return null;

  // Build normalized data: one object per axis, with per-company 0–100 scores
  const chartData = AXES.map(({ key, label, lowerIsBetter }) => {
    const rawValues = companies.map((c) => {
      const v = c.fundamentals[key];
      return typeof v === 'number' ? v : null;
    });

    const valid = rawValues.filter((v): v is number => v !== null);
    const min = valid.length > 0 ? Math.min(...valid) : 0;
    const max = valid.length > 0 ? Math.max(...valid) : 1;
    const span = max - min || 1;

    const entry: Record<string, string | number> = { axis: label };
    companies.forEach((c, i) => {
      const raw = rawValues[i];
      if (raw === null) {
        entry[c.ticker] = 0;
        return;
      }
      let score = ((raw - min) / span) * 100;
      if (lowerIsBetter) score = 100 - score;
      entry[c.ticker] = Math.round(score);
    });
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#2a2d3e" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
        />
        {companies.map((c, i) => (
          <Radar
            key={c.ticker}
            name={c.name}
            dataKey={c.ticker}
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
        <Tooltip
          contentStyle={customTooltipStyle}
          formatter={(value: number) => [`${value}/100`, '']}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px', color: '#94a3b8', paddingTop: '8px' }}
          iconType="circle"
          iconSize={8}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
