'use client';

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { Investment } from '@/lib/types';
import { formatCurrency, getPnlPercent } from '@/lib/utils';

interface Props {
  investments: Investment[];
}

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#4f46e5'];
const SECTOR_COLOR = '#6366f1';

export default function PortfolioCharts({ investments }: Props) {
  // Allocation by asset type
  const allocationMap: Record<string, number> = {};
  investments.forEach((inv) => {
    const val = inv.current_price * inv.quantity;
    allocationMap[inv.asset_type] = (allocationMap[inv.asset_type] || 0) + val;
  });
  const allocationData = Object.entries(allocationMap).map(([name, value]) => ({
    name,
    value: Math.round(value),
  }));

  // Sector distribution
  const sectorMap: Record<string, number> = {};
  investments.forEach((inv) => {
    const val = inv.current_price * inv.quantity;
    sectorMap[inv.sector] = (sectorMap[inv.sector] || 0) + val;
  });
  const sectorData = Object.entries(sectorMap)
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);

  // P&L by asset
  const pnlData = investments
    .map((inv) => ({
      name: inv.asset_name,
      pnl: Math.round(getPnlPercent(inv) * 10) / 10,
    }))
    .sort((a, b) => b.pnl - a.pnl);

  const customTooltipStyle = {
    backgroundColor: '#1a1d2e',
    border: '1px solid #2a2d3e',
    borderRadius: '8px',
    color: '#e2e8f0',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Portfolio Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          {allocationData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {allocationData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Value']}
                  contentStyle={customTooltipStyle}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Sector Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sector Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {sectorData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sectorData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={{ stroke: '#2a2d3e' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Value']}
                  contentStyle={customTooltipStyle}
                />
                <Bar dataKey="value" fill={SECTOR_COLOR} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* P&L Bar Chart */}
      <Card className="lg:col-span-2 xl:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm">P&L % by Asset</CardTitle>
        </CardHeader>
        <CardContent>
          {pnlData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={pnlData} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={{ stroke: '#2a2d3e' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'P&L']}
                  contentStyle={customTooltipStyle}
                />
                <Bar
                  dataKey="pnl"
                  radius={[4, 4, 0, 0]}
                  fill="#6366f1"
                >
                  {pnlData.map((entry, index) => (
                    <Cell
                      key={`pnl-${index}`}
                      fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
