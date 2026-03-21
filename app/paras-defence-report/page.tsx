'use client';

import { useState } from 'react';

type TabId = 'summary' | 'overview' | 'financials' | 'swot' | 'risks' | 'verdict';

const TABS: { id: TabId; label: string }[] = [
  { id: 'summary', label: '📋 Executive Summary' },
  { id: 'overview', label: '🏭 Company Overview' },
  { id: 'financials', label: '📊 Financials' },
  { id: 'swot', label: '⚖️ SWOT' },
  { id: 'risks', label: '⚠️ Risks & Catalysts' },
  { id: 'verdict', label: '🎯 Final Verdict' },
];

const FINANCIALS = [
  { year: 'FY2021', revenue: '143.3', ebitda: '~50.9', pat: '15.8', ebitdaMargin: '25.1%', netMargin: '11.0%', roe: '~8.3%' },
  { year: 'FY2022', revenue: '182.6', ebitda: '~47.7', pat: '27.0', ebitdaMargin: '25.3%', netMargin: '14.9%', roe: '~9.2%' },
  { year: 'FY2023', revenue: '222.4', ebitda: '~53.6', pat: '35.9', ebitdaMargin: '24.1%', netMargin: '16.1%', roe: '~9.1%' },
  { year: 'FY2024', revenue: '253.5', ebitda: '~51.1', pat: '30.0', ebitdaMargin: '20.1%', netMargin: '11.8%', roe: '~8.0%' },
  { year: 'FY2025*', revenue: '~364.7', ebitda: '—', pat: '61.5*', ebitdaMargin: '—', netMargin: '~16.9%', roe: '~11.7%' },
];

const PEERS = [
  { name: 'Paras Defence', mktCap: '5,054', revenue: '~364 (FY25)', pat: '~61.5 (FY25)', notes: 'Small/midcap; optics & electronics specialist.' },
  { name: 'Bharat Electronics (BEL)', mktCap: '3,11,470', revenue: '20,268 (FY24)', pat: '3,943 (FY24)', notes: 'PSU giant, broad defence portfolio.' },
  { name: 'IdeaForge Technology', mktCap: '1,831', revenue: '105 (FY25)', pat: '~break-even', notes: 'UAV/drone co.' },
];

const SWOT = {
  strengths: [
    'Unique IDDM products — only Indian developer of submarine periscopes, hyperspectral cameras, EMP shelters',
    'Rapidly growing order book (₹630 Cr FY24 → ₹928 Cr FY25)',
    'Major contracts secured: L&T ₹305 Cr, DRDO ₹80 Cr',
    'Benefits from "Make-in-India" and Atmanirbhar Bharat policies',
    'CRISIL A-/Stable credit rating; near-debt-free balance sheet',
    '40+ year track record in precision defence engineering',
  ],
  weaknesses: [
    'Promoter-heavy ownership (~58.9%) — limited institutional checks',
    'Revenue is lumpy, heavily dependent on government contracts',
    'EBITDA margin declined from ~26% (FY21) to ~20% (FY24)',
    'Valuation at ~80–90× forward P/E — priced for perfection',
    'No significant export footprint compared to peers',
    'Small scale vs. PSU behemoths (BEL, HAL)',
  ],
  opportunities: [
    "India's defence budget at record ₹7.85 lakh Cr in FY26-27 (75% domestic sourcing mandate)",
    'Drone & anti-drone tech boom post-global conflicts',
    'IUAC MRI magnet collaboration — opens medical imaging market',
    'Paras Semiconductors JV — potential for indigenous microelectronics',
    'Quantum communications and EMIS battlefield systems in development pipeline',
    'Export potential via Elbit Systems (Israel) and Green Optics (Korea) partnerships',
  ],
  threats: [
    'Competition from BEL, foreign suppliers at lower cost or higher scale',
    'Project delays — defence orders routinely face cost overruns',
    'Budget cuts or policy shifts could derail revenue',
    'Technology risk: semiconductor/advanced optics development is extremely hard',
    'At 80× earnings, any earnings miss will crush the stock severely',
    'Export controls (ITAR-type) could block international contracts',
  ],
};

const MAJOR_ORDERS = [
  { deal: 'L&T Electro-Optic Sights', value: '₹305 Cr', detail: '244 high-end "Sight-25HD" naval gun sights (Oct 2024)' },
  { deal: 'DRDO Air-Defence Optics', value: '₹80.28 Cr', detail: 'Optical system for air defence development (Mar 2026)' },
  { deal: 'IRDE Border/UAV Systems', value: '₹53 Cr', detail: 'Surveillance & UAV payload systems' },
  { deal: 'Anti-Drone Solutions', value: 'Undisclosed', detail: 'Multiple paramilitary contracts via Paras Anti-Drone Ltd' },
  { deal: 'Elbit Systems (Israel)', value: 'Undisclosed', detail: 'Export contract for electro-optic systems' },
];

export default function ParasDefenceReportPage() {
  const [activeTab, setActiveTab] = useState<TabId>('summary');

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0d1b3e] via-[#1a1d2e] to-[#0f1117] border-b border-[#2a2d3e] px-6 py-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🛡️</span>
          <h1 className="text-2xl font-bold text-white">Paras Defence &amp; Space Technologies</h1>
        </div>
        <p className="text-slate-400 text-sm mb-3">NSE: PARAS &nbsp;·&nbsp; BSE: 543367 &nbsp;·&nbsp; Deep-Dive Research Report</p>
        <div className="flex flex-wrap gap-2">
          <span className="inline-block bg-red-900/60 text-red-400 text-xs px-3 py-0.5 rounded-full border border-red-800/50">High Risk</span>
          <span className="inline-block bg-yellow-900/60 text-yellow-400 text-xs px-3 py-0.5 rounded-full border border-yellow-800/50">Speculative</span>
          <span className="inline-block bg-indigo-600 text-white text-xs px-3 py-0.5 rounded-full">Updated: March 2026</span>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-[#12151f] border-b border-[#2a2d3e] px-4 py-3 flex gap-3 overflow-x-auto">
        {[
          { label: 'Market Cap', value: '₹5,054 Cr', up: true },
          { label: 'FY25 Revenue', value: '₹364.7 Cr', up: true },
          { label: 'FY25 PAT', value: '₹61.5 Cr', up: true },
          { label: 'Order Backlog', value: '~₹928 Cr', up: true },
          { label: 'Forward P/E', value: '~80–90×', up: false },
          { label: '5-Yr Revenue CAGR', value: '~27%', up: true },
          { label: 'Debt/Equity', value: '~0.03×', up: true },
          { label: 'Promoter Stake', value: '58.9%', up: false },
        ].map((s, i) => (
          <div key={i} className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl px-4 py-3 min-w-[150px] flex-shrink-0">
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className={`text-sm font-bold ${s.up ? 'text-emerald-400' : 'text-red-400'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-[#12151f] border-b border-[#2a2d3e] px-4 py-3 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`text-xs px-3.5 py-1.5 rounded-full border transition-all ${
              activeTab === t.id
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'border-[#2a2d3e] text-slate-400 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-5xl mx-auto space-y-5">

        {/* Executive Summary */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-5">
              <h2 className="text-base font-bold text-slate-100 mb-3">Executive Summary</h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Paras Defence &amp; Space Technologies is an ambitious Indian defence-engineering firm focusing on optics/optronics and defence electronics (including EMP protection and heavy engineering). It reports scorching growth — consolidated revenue climbed from <span className="text-emerald-400 font-semibold">₹143.3 Cr (FY2021)</span> to roughly <span className="text-emerald-400 font-semibold">₹364.7 Cr in FY2025</span>. Its order backlog has also exploded (≈₹928 Cr in FY25 vs ₹630 Cr in FY24).
              </p>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                That said, caution is warranted: Paras trades at stratospheric valuations (<span className="text-red-400 font-semibold">forward P/E ~80–90×</span>), implying the market is pricing in near-miraculous execution. We found no fatal legal or regulatory troubles, but Paras&apos;s success hinges on a few big contracts (e.g. a ₹305 Cr L&amp;T electro-optics order, an ₹80.3 Cr DRDO order) and high defence spending.
              </p>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                With India&apos;s defence budget surging (<span className="text-emerald-400 font-semibold">₹7.85 lakh Cr in FY26-27</span>, of which ~75% is earmarked for domestic sourcing), Paras has strong tailwinds. However, its razor-thin moats and insanely high P/E make it a speculative bet.
              </p>
              <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4 mt-4">
                <p className="text-sm font-semibold text-red-400 mb-1">Bottom Line</p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Paras is a <strong className="text-red-400">high-volatility play</strong>. At current prices and risk-reward, we lean <strong className="text-yellow-400">neutral/avoid</strong> (i.e. not a &quot;buy&quot;) unless its execution continues to be flawless and valuations compress.
                </p>
              </div>
            </div>

            {/* Key Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1a1d2e] border border-emerald-900/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-emerald-400 mb-3">Bull Case Highlights</h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex gap-2"><span className="text-emerald-400 flex-shrink-0">✓</span>Only Indian maker of submarine periscopes, hyperspectral cameras &amp; EMP shelters</li>
                  <li className="flex gap-2"><span className="text-emerald-400 flex-shrink-0">✓</span>Order backlog doubled YoY to ~₹928 Cr in FY25</li>
                  <li className="flex gap-2"><span className="text-emerald-400 flex-shrink-0">✓</span>Major L&amp;T ₹305 Cr contract validates product quality</li>
                  <li className="flex gap-2"><span className="text-emerald-400 flex-shrink-0">✓</span>India&apos;s 75% domestic defence sourcing mandate = captive market</li>
                  <li className="flex gap-2"><span className="text-emerald-400 flex-shrink-0">✓</span>Nearly debt-free post-QIP (D/E ~0.03×)</li>
                  <li className="flex gap-2"><span className="text-emerald-400 flex-shrink-0">✓</span>FY25 PAT doubled YoY to ₹61.5 Cr</li>
                </ul>
              </div>
              <div className="bg-[#1a1d2e] border border-red-900/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-red-400 mb-3">Bear Case Risks</h3>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex gap-2"><span className="text-red-400 flex-shrink-0">✗</span>Forward P/E of ~80–90× — priced for near-perfect execution</li>
                  <li className="flex gap-2"><span className="text-red-400 flex-shrink-0">✗</span>Highly concentrated — a few big contracts drive the entire story</li>
                  <li className="flex gap-2"><span className="text-red-400 flex-shrink-0">✗</span>EBITDA margin declining trend (26% → 20% from FY21–FY24)</li>
                  <li className="flex gap-2"><span className="text-red-400 flex-shrink-0">✗</span>Promoter-heavy; CFO is family member</li>
                  <li className="flex gap-2"><span className="text-red-400 flex-shrink-0">✗</span>Small-cap with limited institutional liquidity</li>
                  <li className="flex gap-2"><span className="text-red-400 flex-shrink-0">✗</span>Any contract delay = severe stock downside at current valuations</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Company Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-5">
              <h2 className="text-base font-bold text-slate-100 mb-4">Business &amp; Segments</h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                Paras Defence is a Tier-2 &quot;IDDM&quot; (indigenously designed, developed, manufactured) engineering group serving India&apos;s defence and space sectors. Its two main verticals are:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-[#0f1117] rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-indigo-400 mb-2">🔭 Optics &amp; Optronic Systems</h4>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Night-vision lenses &amp; imaging systems</li>
                    <li>• Deployable space antennas</li>
                    <li>• Infrared lenses/mirrors &amp; optical engines</li>
                    <li>• Electro-optic targeting systems</li>
                    <li>• Submarine periscopes (sole Indian maker)</li>
                    <li>• Hyperspectral imaging systems</li>
                  </ul>
                </div>
                <div className="bg-[#0f1117] rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-indigo-400 mb-2">⚡ Defence Engineering</h4>
                  <ul className="text-xs text-slate-400 space-y-1">
                    <li>• Defence electronics &amp; rugged displays</li>
                    <li>• EMP protection solutions &amp; shelters</li>
                    <li>• Heavy engineering components</li>
                    <li>• Missile fuzes &amp; radio equipment</li>
                    <li>• UAVs &amp; anti-drone systems</li>
                    <li>• Border security radar systems</li>
                  </ul>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Key customers include <strong className="text-slate-200">DRDO, ISRO</strong> and major DPSUs/defence primes (L&amp;T, BEL, HAL, Tata). Paras is reportedly the sole Indian (or Asia-Pacific) supplier for many niche products.
              </p>
            </div>

            <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-5">
              <h2 className="text-base font-bold text-slate-100 mb-4">Ownership &amp; Corporate Structure</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Promoter Stake', value: '58.9%', note: 'As of Mar 2024' },
                  { label: 'Total Promoter Control', value: '~62.5%', note: 'Incl. directors' },
                  { label: 'Credit Rating', value: 'A-/Stable', note: 'CRISIL (LT)' },
                  { label: 'Listed Since', value: 'BSE 543367', note: 'Past decade' },
                ].map((s, i) => (
                  <div key={i} className="bg-[#0f1117] rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">{s.label}</div>
                    <div className="text-sm font-bold text-slate-200">{s.value}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{s.note}</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-slate-400 space-y-1.5">
                <p><strong className="text-slate-300">Chairman:</strong> Sharad Virji Shah (founder, non-executive)</p>
                <p><strong className="text-slate-300">MD:</strong> Munjal Shah (son of Chairman)</p>
                <p><strong className="text-slate-300">CFO:</strong> Sharad Shah&apos;s son-in-law — tightly-held family structure</p>
                <p><strong className="text-slate-300">Key Subsidiaries:</strong> Paras Aerospace, Paras Anti-Drone, Quantico Tech (Israeli JV for inertial systems), Opel Tech (SG), Ayatti Innovative, MechTech Thermal, Paras Avionics (2025)</p>
                <p><strong className="text-slate-300">Recent Corporate Actions:</strong> 1:2 share split (Jun 2025); QIP of ₹135 Cr at ₹1,045/share (Oct 2024)</p>
              </div>
            </div>

            <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-5">
              <h2 className="text-base font-bold text-slate-100 mb-4">Recent Developments (2023–2026)</h2>
              <div className="space-y-3">
                {[
                  { period: 'Oct 2024', event: 'L&T Order', detail: '₹305 Cr order for 244 "Sight-25HD" electro-optic systems' },
                  { period: 'Oct 2024', event: 'QIP Fundraise', detail: 'Raised ~₹135 Cr at ₹1,045/share for capacity expansion & R&D' },
                  { period: 'Nov 2025', event: 'IUAC MoU', detail: 'Partnership with Inter-University Accelerator Centre for MRI magnet & medical imaging systems' },
                  { period: 'Jun 2025', event: 'Share Split', detail: '1:2 stock split executed' },
                  { period: 'Mar 2026', event: 'DRDO Order', detail: '₹80.28 Cr order from DRDO/IRDE for Air Defence Optical System' },
                  { period: 'Mar 2026', event: 'Korea MoU', detail: 'MoU with Green Optics Co. (South Korea) to co-develop advanced optical systems' },
                  { period: '2025', event: 'Green UAV Exit', detail: 'Sold 100% of Paras Green UAV Pvt. Ltd to Euro Asia Exports for ₹10 lakh (inactive unit written off)' },
                ].map((d, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="text-xs text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded-lg flex-shrink-0 w-24 text-center">{d.period}</span>
                    <div>
                      <span className="text-xs font-semibold text-slate-200">{d.event}: </span>
                      <span className="text-xs text-slate-400">{d.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Financials */}
        {activeTab === 'financials' && (
          <div className="space-y-4">
            <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-5">
              <h2 className="text-base font-bold text-slate-100 mb-4">5-Year Financial Summary (₹ Crores)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#2a2d3e]">
                      {['Year', 'Revenue', 'EBITDA', 'PAT', 'EBITDA Margin', 'Net Margin', 'ROE'].map((h) => (
                        <th key={h} className="text-left py-2 px-3 text-slate-500 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FINANCIALS.map((row, i) => (
                      <tr key={i} className={`border-b border-[#2a2d3e]/50 ${i === FINANCIALS.length - 1 ? 'bg-indigo-950/20' : ''}`}>
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{row.year}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-semibold">{row.revenue}</td>
                        <td className="py-2.5 px-3 text-slate-300">{row.ebitda}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-semibold">{row.pat}</td>
                        <td className="py-2.5 px-3 text-slate-300">{row.ebitdaMargin}</td>
                        <td className="py-2.5 px-3 text-slate-300">{row.netMargin}</td>
                        <td className="py-2.5 px-3 text-slate-300">{row.roe}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-600 mt-3">*FY2025 PAT and revenue are interim estimates from latest filings. EBITDA not explicitly reported; PBT doubled to ~₹83.6 Cr vs ₹40.5 Cr (FY24).</p>
            </div>

            {/* Revenue Trend Visual */}
            <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-100 mb-4">Revenue Growth Trend</h3>
              <div className="space-y-2">
                {FINANCIALS.map((row, i) => {
                  const pct = (parseFloat(row.revenue.replace('~', '')) / 400) * 100;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-16 flex-shrink-0">{row.year}</span>
                      <div className="flex-1 bg-[#2a2d3e] rounded h-5 overflow-hidden">
                        <div
                          className="h-5 rounded flex items-center px-2"
                          style={{ width: `${pct}%`, backgroundColor: '#4f46e5' }}
                        >
                          <span className="text-xs text-white font-semibold">₹{row.revenue} Cr</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-3">5-year Revenue CAGR: ~27%</p>
            </div>

            {/* Balance Sheet Highlights */}
            <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-100 mb-4">Balance Sheet &amp; Key Ratios</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Total Equity (FY25)', value: '₹636.6 Cr', up: true },
                  { label: 'Debt/Equity (FY25)', value: '~0.03×', up: true },
                  { label: 'Current Ratio', value: '>2.0×', up: true },
                  { label: 'ROCE (FY24)', value: '~9.8%', up: false },
                  { label: 'EPS (FY24, post-split)', value: '~₹6.9', up: false },
                  { label: 'QIP Raise (Oct 2024)', value: '₹135 Cr', up: true },
                ].map((s, i) => (
                  <div key={i} className="bg-[#0f1117] rounded-lg p-3">
                    <div className="text-xs text-slate-500 mb-1">{s.label}</div>
                    <div className={`text-sm font-bold ${s.up ? 'text-emerald-400' : 'text-slate-300'}`}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Peer Comparison */}
            <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-100 mb-4">Peer Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#2a2d3e]">
                      {['Company', 'Mkt Cap (₹Cr)', 'FY Revenue (₹Cr)', 'FY PAT (₹Cr)', 'Notes'].map((h) => (
                        <th key={h} className="text-left py-2 px-3 text-slate-500 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PEERS.map((row, i) => (
                      <tr key={i} className={`border-b border-[#2a2d3e]/50 ${i === 0 ? 'bg-indigo-950/20' : ''}`}>
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{row.name}</td>
                        <td className="py-2.5 px-3 text-slate-300">{row.mktCap}</td>
                        <td className="py-2.5 px-3 text-emerald-400">{row.revenue}</td>
                        <td className="py-2.5 px-3 text-emerald-400">{row.pat}</td>
                        <td className="py-2.5 px-3 text-slate-400">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-3">Despite smaller scale, Paras&apos;s margins (11–15%) are competitive. BEL trades at low single-digit P/E vs Paras&apos;s ~80–90×.</p>
            </div>

            {/* Order Backlog */}
            <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-100 mb-4">Order Backlog &amp; Major Contracts</h3>
              <div className="flex gap-3 mb-4 overflow-x-auto">
                {[
                  { year: 'FY2023', value: '₹393 Cr' },
                  { year: 'FY2024', value: '₹630 Cr' },
                  { year: 'FY2025', value: '~₹928 Cr' },
                ].map((o, i) => (
                  <div key={i} className="bg-[#0f1117] rounded-lg p-3 min-w-[120px] flex-shrink-0 text-center">
                    <div className="text-xs text-slate-500 mb-1">{o.year}</div>
                    <div className="text-sm font-bold text-emerald-400">{o.value}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {MAJOR_ORDERS.map((o, i) => (
                  <div key={i} className="flex gap-3 items-start border-b border-[#2a2d3e]/50 pb-2 last:border-0">
                    <span className="text-xs font-bold text-indigo-400 w-32 flex-shrink-0">{o.value}</span>
                    <div>
                      <span className="text-xs font-semibold text-slate-200">{o.deal}: </span>
                      <span className="text-xs text-slate-400">{o.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SWOT */}
        {activeTab === 'swot' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1a1d2e] border border-emerald-900/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-emerald-400 mb-3">💪 Strengths</h3>
                <ul className="space-y-2">
                  {SWOT.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-300">
                      <span className="text-emerald-400 flex-shrink-0 mt-0.5">✓</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#1a1d2e] border border-red-900/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-red-400 mb-3">⚡ Weaknesses</h3>
                <ul className="space-y-2">
                  {SWOT.weaknesses.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-300">
                      <span className="text-red-400 flex-shrink-0 mt-0.5">✗</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#1a1d2e] border border-indigo-900/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-indigo-400 mb-3">🚀 Opportunities</h3>
                <ul className="space-y-2">
                  {SWOT.opportunities.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-300">
                      <span className="text-indigo-400 flex-shrink-0 mt-0.5">→</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#1a1d2e] border border-yellow-900/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-yellow-400 mb-3">⚠️ Threats</h3>
                <ul className="space-y-2">
                  {SWOT.threats.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-300">
                      <span className="text-yellow-400 flex-shrink-0 mt-0.5">!</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Competitive Landscape */}
            <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-100 mb-4">Competitive Landscape</h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Paras operates in a niche of defence electronics/optronics. Key comparators range from massive PSUs to small specialists:
              </p>
              <div className="space-y-2 text-xs text-slate-300">
                {[
                  { name: 'Bharat Electronics Ltd (BEL)', note: 'Government behemoth. ₹3.11L Cr mcap, ₹20,268 Cr FY24 revenue. Different product lines (radars, comms). Trades at low single-digit P/E.' },
                  { name: 'Hindustan Aeronautics Ltd (HAL)', note: '₹2.53L Cr mcap, ₹30,100 Cr FY25 sales. Largely disjoint product mix (aircraft, helicopters).' },
                  { name: 'Bharat Dynamics Ltd (BDL)', note: 'Missile manufacturer (~₹45,800 Cr mcap). Partial overlap (Paras makes some missile components).' },
                  { name: 'IdeaForge Technology', note: 'Drone specialist. ₹1,831 Cr mcap, ₹105 Cr FY25 sales — smaller in every metric vs Paras.' },
                  { name: 'Alpha Design & Tech / Aequs', note: 'Mid-tier private aerospace/defence integrators (₹6,000–8,200 Cr mcap).' },
                ].map((p, i) => (
                  <div key={i} className="border-b border-[#2a2d3e]/50 pb-2 last:border-0">
                    <span className="font-semibold text-slate-200">{p.name}: </span>
                    <span className="text-slate-400">{p.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Risks & Catalysts */}
        {activeTab === 'risks' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1a1d2e] border border-emerald-900/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-emerald-400 mb-3">🟢 Catalysts</h3>
                <ul className="space-y-3 text-xs text-slate-300">
                  {[
                    { title: 'Record Defence Budget', detail: '₹7.85 lakh Cr in FY26-27; 75% domestic sourcing mandate = captive market' },
                    { title: 'Anti-Drone Boom', detail: 'Post-Ukraine conflict demand for C-UAS systems exploding globally' },
                    { title: 'Rich Contract Pipeline', detail: 'L&T, DRDO orders validated; more in pipeline for electro-optic &amp; battlefield systems' },
                    { title: 'New Tech Bets', detail: 'Quantum communications, medical MRI (IUAC), semiconductor JV — potential to open fresh markets' },
                    { title: 'Export Partnerships', detail: 'Elbit Systems (Israel), Green Optics (Korea) partnerships enable global reach' },
                    { title: 'Make-in-India Tailwind', detail: 'Import bans on 400+ items; Paras qualifies as IDDM — near-captive domestic demand' },
                  ].map((c, i) => (
                    <li key={i} className="border-b border-[#2a2d3e]/50 pb-2 last:border-0">
                      <div className="font-semibold text-emerald-400 mb-0.5">{c.title}</div>
                      <div dangerouslySetInnerHTML={{ __html: c.detail }} />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#1a1d2e] border border-red-900/50 rounded-xl p-5">
                <h3 className="text-sm font-bold text-red-400 mb-3">🔴 Risks</h3>
                <ul className="space-y-3 text-xs text-slate-300">
                  {[
                    { title: 'Execution Risk', detail: 'Defence projects often face cost overruns/delays; Paras has limited bench strength' },
                    { title: 'Valuation Risk', detail: '~80–90× P/E leaves zero margin of safety. Any slowdown = catastrophic multiple compression' },
                    { title: 'Concentration Risk', detail: 'A handful of big orders (L&T, DRDO) drive the entire narrative. Any hiccup = major hole in revenue' },
                    { title: 'Supply Chain', detail: 'Global chip crunch, specialty optics imports could stall deliverables' },
                    { title: 'Competitive Pressure', detail: 'PSUs like BEL or new private entrants could undercut on price or scale' },
                    { title: 'Geopolitical Risk', detail: 'Export approvals may be blocked; ITAR-type controls could block international contracts' },
                  ].map((r, i) => (
                    <li key={i} className="border-b border-[#2a2d3e]/50 pb-2 last:border-0">
                      <div className="font-semibold text-red-400 mb-0.5">{r.title}</div>
                      <div>{r.detail}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ESG & Governance */}
            <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-100 mb-4">ESG &amp; Governance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
                <div>
                  <h4 className="text-slate-200 font-semibold mb-2">Governance</h4>
                  <p>Compliant with SEBI/Companies Act. Independent directors on audit/NRC. Promoter-heavy (father/son Chairman-MD, CFO is family) — conflict-of-interest risk common in midcaps but worth monitoring.</p>
                </div>
                <div>
                  <h4 className="text-slate-200 font-semibold mb-2">Social/CSR</h4>
                  <p>CSR committee chaired by Munjal Shah. FY24 CSR spend: ₹69 lakhs (~0.27% of net profit). Meets mandatory requirements. No labour disputes or compliance lapses reported.</p>
                </div>
                <div>
                  <h4 className="text-slate-200 font-semibold mb-2">Legal/Regulatory</h4>
                  <p>No major scandals or litigations found. Holds all required Arms Act &amp; New Explosives Rules licenses. CRISIL A-/Stable rating — no current financial/legal red flags.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Final Verdict */}
        {activeTab === 'verdict' && (
          <div className="space-y-4">
            <div className="bg-[#1a1d2e] border border-yellow-900/50 rounded-xl p-5">
              <h2 className="text-base font-bold text-yellow-400 mb-4">Final Verdict</h2>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                In summary, Paras Defence is a <strong className="text-red-400">gamble, not a sure thing</strong>. It offers a compelling story — high-tech, indigenously made defence gear in a booming market — but that story is already priced in, and then some. The company&apos;s execution has been solid so far, but nothing about its business is ordinary; it&apos;s dealing with extremely complex technologies and fickle government spending.
              </p>
              <p className="text-sm text-slate-300 leading-relaxed mb-4">
                At current market prices (and sky-high valuations), there&apos;s very little margin of safety. Any rational investor must ask: <em className="text-slate-200">&quot;Is it worth paying 80–90× earnings for even the chance of hitting home runs?&quot;</em>
              </p>
              <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-red-400 mb-1">Recommendation: Neutral / Avoid</p>
                <p className="text-sm text-slate-300 leading-relaxed">
                  A conservative stance would be to sit on the sidelines (or trim any position) until valuations normalize or growth is proven. The company looks promising, but the stock&apos;s extreme pricing makes it too risky to buy outright right now.
                </p>
              </div>
              <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-4">
                <p className="text-sm font-semibold text-emerald-400 mb-1">When to Reconsider</p>
                <ul className="text-xs text-slate-300 space-y-1">
                  <li>• Valuation compression to more reasonable levels (P/E &lt; 40–50×)</li>
                  <li>• Consistent margin improvement back toward 24–26% EBITDA</li>
                  <li>• Successful execution of L&amp;T Sight-25HD contract delivery</li>
                  <li>• Diversification beyond 2–3 large contracts</li>
                  <li>• Evidence of meaningful export revenue stream</li>
                </ul>
              </div>
            </div>

            {/* Sources */}
            <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-100 mb-3">External Research Links</h3>
              <div className="flex gap-3 flex-wrap">
                <a href="https://www.screener.in/company/PARAS/" target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 hover:opacity-80 transition-opacity">📊 Screener.in</a>
                <a href="https://www.moneycontrol.com/india/stockpricequote/defence/parasdefencespacetech/PDST" target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 hover:opacity-80 transition-opacity">📈 Moneycontrol</a>
                <a href="https://www.nseindia.com/get-quotes/equity?symbol=PARAS" target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg bg-orange-950/40 text-orange-400 border border-orange-900/40 hover:opacity-80 transition-opacity">🏦 NSE Quote</a>
                <a href="https://www.bseindia.com/stock-share-price/paras-defence-and-space-technologies-ltd/paras/543367/" target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg bg-blue-950/40 text-blue-400 border border-blue-900/40 hover:opacity-80 transition-opacity">🏛️ BSE Filing</a>
              </div>
              <p className="text-xs text-slate-600 mt-3">Sources: Official financial filings (annual reports, stock exchange announcements) and reputable business news. All data cited in text or tables.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
