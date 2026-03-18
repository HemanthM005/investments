'use client';

import { useState } from 'react';

type TabId = 'overview' | 'safe' | 'growth' | 'gold' | 'stocks' | 'howto';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'safe', label: '🛡️ Safe' },
  { id: 'growth', label: '📈 Growth' },
  { id: 'gold', label: '🥇 Gold' },
  { id: 'stocks', label: '🚀 Stocks' },
  { id: 'howto', label: '🗺️ How to Start' },
];

const ALLOC = [
  { emoji: '🛡️', amount: '₹60,000', pct: '20%', label: 'Emergency + FD (Safety Net)', barW: 20, barColor: '#10b981' },
  { emoji: '📈', amount: '₹1,20,000', pct: '40%', label: 'Mutual Funds (SIP)', barW: 40, barColor: '#4f46e5' },
  { emoji: '🥇', amount: '₹45,000', pct: '15%', label: 'Gold ETF / Fund', barW: 15, barColor: '#fbbf24' },
  { emoji: '🚀', amount: '₹60,000', pct: '20%', label: 'Direct Stocks / Index ETF', barW: 20, barColor: '#f59e0b' },
  { emoji: '🏗️', amount: '₹15,000', pct: '5%', label: 'REITs / Bonds', barW: 5, barColor: '#ec4899' },
];

const BAR_DATA = [
  { label: 'Mutual Funds', right: '40% — ₹1.2L', w: 40, color: '#4f46e5' },
  { label: 'Safety (FD)', right: '20% — ₹60K', w: 20, color: '#10b981' },
  { label: 'Stocks / ETF', right: '20% — ₹60K', w: 20, color: '#f59e0b' },
  { label: 'Gold', right: '15% — ₹45K', w: 15, color: '#fbbf24' },
  { label: 'REITs / Bonds', right: '5% — ₹15K', w: 5, color: '#ec4899' },
];

function StatRow({ label, value, valueClass = 'text-slate-200' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}

function InfoCard({ title, badge, badgeColor, children }: { title: string; badge?: string; badgeColor?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1e2433] border border-slate-700/50 rounded-xl p-4 mb-4">
      <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2 flex-wrap">
        {title}
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded-xl font-semibold ${badgeColor}`}>{badge}</span>
        )}
      </h3>
      {children}
    </div>
  );
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#1a2744] border border-blue-800/50 rounded-xl p-3 mt-3 text-xs text-blue-300 leading-relaxed">
      {children}
    </div>
  );
}

function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-3 mt-3 text-xs text-red-300 leading-relaxed">
      {children}
    </div>
  );
}

function FundRow({ name, tag }: { name: string; tag: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0 text-xs">
      <span className="text-slate-200 font-medium">{name}</span>
      <span className="text-emerald-400 font-bold">{tag}</span>
    </div>
  );
}

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3 mb-4 items-start">
      <div className="bg-indigo-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{num}</div>
      <div>
        <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function Invest3LakhsPlanPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="bg-gradient-to-br from-[#1a1f2e] to-[#2d1b69] border-b border-slate-700/50 px-6 py-7 text-center">
        <h1 className="text-2xl font-bold text-violet-400">💰 Invest ₹3 Lakhs Smartly — India, March 2026</h1>
        <p className="text-slate-400 text-sm mt-1.5">Real-time market context · Diversified strategy · All risk levels</p>
      </header>

      {/* Market Banner */}
      <div className="mx-4 mt-4 bg-[#1e2433] border-l-4 border-yellow-500 px-4 py-3 rounded-lg text-xs text-yellow-300 leading-relaxed">
        <strong className="text-yellow-400">📊 Current Market Pulse (March 11, 2026):</strong> Sensex at ~78,206 | Nifty 50 at ~24,261 | Market down ~7% over past month amid FII selling &amp; geopolitical tension.{' '}
        <strong className="text-yellow-400">This is actually a good time to start SIPs — buy at lower prices!</strong>
      </div>

      {/* Nav */}
      <nav className="flex flex-wrap gap-2 px-4 py-3 bg-[#161b27] border-b border-slate-700/50 mt-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-xs px-3.5 py-1.5 rounded-full border transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-[#1e2433] border-slate-700/50 text-slate-400 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="max-w-[900px] mx-auto px-4 py-5">

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-lg font-bold text-violet-400 mb-4">Your ₹3 Lakh Allocation Plan</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
              {ALLOC.map((a, i) => (
                <div key={i} className="bg-[#1e2433] border border-slate-700/50 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-1">{a.emoji}</div>
                  <div className="text-base font-bold text-violet-400">{a.amount}</div>
                  <div className="text-xs text-emerald-400 font-semibold">{a.pct}</div>
                  <div className="text-xs text-slate-400 mt-1 leading-tight">{a.label}</div>
                </div>
              ))}
            </div>
            <div className="space-y-3 mb-5">
              {BAR_DATA.map((b, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{b.label}</span>
                    <span>{b.right}</span>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg h-2.5 overflow-hidden">
                    <div className="h-full rounded-lg transition-all duration-500" style={{ width: `${b.w}%`, backgroundColor: b.color }} />
                  </div>
                </div>
              ))}
            </div>
            <TipBox>
              <strong className="text-blue-300">💡 Why this allocation right now?</strong> Nifty has corrected ~10% from its December 2025 peak of 26,325. Analysts at Morgan Stanley and Jefferies are bullish on Sensex hitting 95,000–1,07,000 by year end. This correction is a SIP opportunity. Gold is also trending strong amid global uncertainty. This mix balances safety, growth, and hedging perfectly.
            </TipBox>
          </div>
        )}

        {/* SAFE */}
        {activeTab === 'safe' && (
          <div>
            <h2 className="text-lg font-bold text-violet-400 mb-1">🛡️ Safety Net — ₹60,000 (20%)</h2>
            <p className="text-xs text-slate-400 mb-4">Before you invest anywhere, you need a liquid cushion. This is non-negotiable.</p>
            <InfoCard title="🏦 Bank Fixed Deposit (FD) — ₹40,000" badge="LOW RISK" badgeColor="bg-emerald-950/60 text-emerald-400">
              <StatRow label="Current Interest Rate" value="6.5% – 7.5% p.a." valueClass="text-emerald-400" />
              <StatRow label="Suggested Tenure" value="1 year (renewable)" />
              <StatRow label="Insurance Cover" value="Up to ₹5 Lakh (DICGC)" />
              <StatRow label="Best Banks (Mar 2026)" value="SBI, HDFC, ICICI, IndusInd" />
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">Small Finance Banks like Unity SFB or Suryoday SFB offer 8–9% FD rates, but carry slightly more risk than large banks. Suitable if you want slightly better returns with acceptable safety.</p>
              <TipBox><strong className="text-blue-300">Pro Tip:</strong> Keep ₹20,000 in a liquid savings account (like Fi, Jupiter, or Kotak 811) for instant emergency access. The remaining ₹40,000 goes into the FD.</TipBox>
            </InfoCard>
            <InfoCard title="📮 Post Office Schemes — Optional Alternative" badge="GOVT BACKED" badgeColor="bg-emerald-950/60 text-emerald-400">
              <StatRow label="Post Office RD" value="7.0% p.a. (SBI comparable)" valueClass="text-emerald-400" />
              <StatRow label="NSC (5 years)" value="7.7% p.a." valueClass="text-emerald-400" />
              <StatRow label="Risk" value="Zero — 100% Govt backed" valueClass="text-emerald-400" />
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">If you distrust private banks entirely, Post Office schemes are the safest in India — backed by the Government of India itself.</p>
            </InfoCard>
          </div>
        )}

        {/* GROWTH */}
        {activeTab === 'growth' && (
          <div>
            <h2 className="text-lg font-bold text-violet-400 mb-1">📈 Mutual Funds via SIP — ₹1,20,000 (40%)</h2>
            <p className="text-xs text-slate-400 mb-4">Don&apos;t invest ₹1.2L as lump sum. Convert it to ₹10,000/month SIP for 12 months. This way you buy more units when market is low (like right now!) and fewer when it&apos;s high — called Rupee Cost Averaging.</p>
            <InfoCard title="🏛️ Nifty 50 Index Fund — ₹4,000/month" badge="MED RISK" badgeColor="bg-blue-950/60 text-blue-300">
              <StatRow label="What it does" value="Tracks India's top 50 companies" />
              <StatRow label="10-yr avg returns" value="~13–15% p.a." valueClass="text-emerald-400" />
              <StatRow label="Expense Ratio" value="~0.1% (very low)" />
              <StatRow label="Best Funds" value="UTI Nifty 50, Nippon Nifty 50" />
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">The simplest, most efficient long-term investment. You own a slice of India&apos;s 50 biggest companies — Reliance, TCS, HDFC Bank, Infosys, and more. When India grows, you grow.</p>
            </InfoCard>
            <InfoCard title="🌊 Flexi Cap Fund — ₹3,000/month" badge="MED-HIGH RISK" badgeColor="bg-blue-950/60 text-blue-300">
              <StatRow label="What it does" value="Invests across large, mid & small cap" />
              <StatRow label="5-yr avg returns" value="~16–20% p.a." valueClass="text-emerald-400" />
              <StatRow label="Best Funds (2026)" value="HDFC Flexi Cap, Parag Parikh Flexi Cap" />
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">Fund manager actively picks stocks across all company sizes. Parag Parikh also invests ~25% in international stocks (Google, Meta, etc.) giving you global diversification automatically.</p>
            </InfoCard>
            <InfoCard title="⚖️ Hybrid / Balanced Advantage Fund — ₹2,000/month" badge="LOW-MED RISK" badgeColor="bg-emerald-950/60 text-emerald-400">
              <StatRow label="What it does" value="Auto-balances equity & debt based on market" />
              <StatRow label="Expected returns" value="~10–13% p.a." valueClass="text-emerald-400" />
              <StatRow label="Best Funds" value="HDFC Balanced Advantage, ICICI Pru BAF" />
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">When markets are expensive, it shifts to debt. When markets are cheap (like now), it shifts to equity. This is a smart, auto-pilot fund — great for beginners who don&apos;t want to worry.</p>
            </InfoCard>
            <InfoCard title="🔥 Mid/Small Cap Fund — ₹1,000/month" badge="HIGH RISK" badgeColor="bg-red-950/60 text-red-400">
              <StatRow label="What it does" value="Invests in emerging, faster-growing companies" />
              <StatRow label="5-yr avg returns" value="~20–28% p.a. (but volatile!)" valueClass="text-emerald-400" />
              <StatRow label="Best Funds" value="Nippon Small Cap, SBI Small Cap" />
              <p className="text-xs text-slate-400 mt-3 leading-relaxed">High risk, high reward. Can fall 40–50% in a crash, but historically recovers and outperforms over 7+ years. Keep only a small portion here.</p>
              <WarnBox><strong>⚠️ Warning:</strong> Only invest in small cap if you can stay invested for 7+ years without touching the money.</WarnBox>
            </InfoCard>
            <TipBox>
              <strong className="text-blue-300">📱 Platforms to use:</strong> Groww, Zerodha Coin, Paytm Money, or MFCentral — all SEBI-regulated, zero commission for direct plans. Always choose <strong className="text-blue-200">Direct Plan</strong> over Regular Plan to avoid paying extra commission to distributors.
            </TipBox>
          </div>
        )}

        {/* GOLD */}
        {activeTab === 'gold' && (
          <div>
            <h2 className="text-lg font-bold text-violet-400 mb-1">🥇 Gold — ₹45,000 (15%)</h2>
            <p className="text-xs text-slate-400 mb-4">Gold has been one of the best-performing assets in India over 3–5 years. With global uncertainty, geopolitical tension, and FII outflows, gold remains a critical hedge in 2026.</p>
            <InfoCard title="📊 Gold Performance (Real Data)" badge="🔥 TRENDING" badgeColor="bg-orange-950/60 text-yellow-400">
              <StatRow label="Gold ETF 3-yr CAGR (Nippon)" value="~39.6%" valueClass="text-emerald-400" />
              <StatRow label="Gold ETF 5-yr CAGR (avg)" value="~27%" valueClass="text-emerald-400" />
              <StatRow label="Gold AUM in India (early 2026)" value="₹32,500+ Crore" />
              <StatRow label="Current sentiment" value="Bullish (safe haven demand)" valueClass="text-yellow-400" />
            </InfoCard>
            <InfoCard title="💻 Gold ETF — ₹30,000 (Recommended)" badge="LOW RISK" badgeColor="bg-emerald-950/60 text-emerald-400">
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">Traded on NSE/BSE just like stocks. Backed by 99.5% pure physical gold held by the fund. No storage risk, no purity concern, instant liquidity.</p>
              <FundRow name="LIC MF Gold ETF" tag="#1 by 5-yr CAGR" />
              <FundRow name="Nippon India Gold ETF" tag="Largest, most liquid" />
              <FundRow name="HDFC Gold ETF" tag="Reliable, large AUM" />
              <FundRow name="ICICI Prudential Gold ETF" tag="Long-term track record" />
              <FundRow name="SBI Gold ETF" tag="Trust + low cost" />
              <p className="text-xs text-slate-400 mt-3">Need a Demat account to buy ETFs. You can buy even 1 unit (~₹600–800 currently).</p>
            </InfoCard>
            <InfoCard title="🏅 Gold Mutual Fund (SIP) — ₹15,000 (via SIP)" badge="LOW RISK" badgeColor="bg-emerald-950/60 text-emerald-400">
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">If you don&apos;t have a Demat account, Gold Mutual Funds are a perfect alternative. They invest in Gold ETFs on your behalf. You can do SIP from ₹100/month.</p>
              <FundRow name="Nippon India Gold Savings Fund" tag="Most popular" />
              <FundRow name="Kotak Gold Fund" tag="Low tracking error" />
              <FundRow name="HDFC Gold Fund" tag="Trusted & stable" />
              <TipBox><strong className="text-blue-300">💡 Current View:</strong> Multiple macro forces — weak USD, central bank gold buying, geopolitical tensions, and Fed rate uncertainty — are supporting gold prices heading into 2026. A 10–15% portfolio allocation to gold is ideal right now.</TipBox>
            </InfoCard>
          </div>
        )}

        {/* STOCKS */}
        {activeTab === 'stocks' && (
          <div>
            <h2 className="text-lg font-bold text-violet-400 mb-4">🚀 Direct Stocks + REITs — ₹75,000 (25%)</h2>
            <InfoCard title="📉 Current Market Context" badge="OPPORTUNITY" badgeColor="bg-orange-950/60 text-yellow-400">
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">The Nifty 50 has fallen ~10% from its December 2025 peak of 26,325 and is now at 24,261. Sensex is at 78,206 — down ~7% in one month. This correction is driven by FII outflows, IT sector pressure, geopolitical tensions, and crude oil volatility — NOT by poor Indian fundamentals.</p>
              <StatRow label="Sensex (Mar 10, 2026)" value="78,206" valueClass="text-yellow-400" />
              <StatRow label="Nifty 50 (Mar 10, 2026)" value="24,261" valueClass="text-yellow-400" />
              <StatRow label="Morgan Stanley Target (Dec 2026)" value="95,000 (base) – 1,07,000 (bull)" valueClass="text-emerald-400" />
              <StatRow label="Jefferies Outlook" value="10–15% more upside possible" valueClass="text-emerald-400" />
              <TipBox><strong className="text-blue-300">💡 What this means for you:</strong> You&apos;re potentially buying stocks near a local bottom. Don&apos;t invest ₹60,000 at once — stagger it over 3–4 months.</TipBox>
            </InfoCard>
            <InfoCard title="📦 Nifty 50 / Nifty Next 50 ETF — ₹30,000" badge="MED RISK" badgeColor="bg-blue-950/60 text-blue-300">
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">The safest way to invest in the stock market. You own all 50 top companies with one click. Trade it like a stock on Zerodha, Groww, or Angel One.</p>
              <StatRow label="Nifty BeES (Nippon)" value="Most liquid Nifty ETF" />
              <StatRow label="Mirae Asset Nifty 50 ETF" value="Low expense ratio" />
              <StatRow label="Motilal Nifty Next 50 ETF" value="Mid-large blend exposure" />
            </InfoCard>
            <InfoCard title="📌 Blue-Chip Direct Stocks — ₹30,000" badge="MED-HIGH RISK" badgeColor="bg-blue-950/60 text-blue-300">
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">Only if you&apos;re willing to do some research. Based on March 2026 market trends, these sectors are showing relative strength:</p>
              <StatRow label="🏥 Healthcare / Pharma" value="+2–2.2% even during crash" valueClass="text-emerald-400" />
              <StatRow label="⚙️ Metal / Infra" value="Positive momentum" valueClass="text-emerald-400" />
              <StatRow label="🏦 Banking (ICICI, HDFC)" value="Corrected — value opportunity" valueClass="text-yellow-400" />
              <StatRow label="🚗 Auto (M&M, Maruti)" value="Recovery leader in rebound" valueClass="text-yellow-400" />
              <StatRow label="💻 IT (TCS, Infosys)" value="Weak — under US slowdown pressure" valueClass="text-red-400" />
              <WarnBox><strong>⚠️</strong> Don&apos;t put all ₹30,000 in one stock. Spread across 3–5 companies in different sectors. Never invest borrowed money in stocks.</WarnBox>
            </InfoCard>
            <InfoCard title="🏢 REITs (Real Estate Investment Trusts) — ₹15,000" badge="MED RISK" badgeColor="bg-blue-950/60 text-blue-300">
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">Invest in commercial real estate (offices, malls) without buying property. Listed on NSE/BSE. Pay regular rental dividends to investors.</p>
              <StatRow label="Embassy Office Parks REIT" value="India's largest REIT" />
              <StatRow label="Mindspace Business Parks REIT" value="Strong rental income" />
              <StatRow label="Dividend Yield" value="~6–8% annually" valueClass="text-emerald-400" />
              <p className="text-xs text-slate-400 mt-3">Nifty Realty fell 4.9% recently — meaning REITs are on sale right now. Good entry point for income-seeking investors.</p>
            </InfoCard>
          </div>
        )}

        {/* HOW TO START */}
        {activeTab === 'howto' && (
          <div>
            <h2 className="text-lg font-bold text-violet-400 mb-5">🗺️ Step-by-Step: How to Start Today</h2>
            <Step num={1} title="Open a Demat + Trading Account" desc="Use Zerodha (₹0 account opening, ₹20/trade) or Groww (free). You need this for buying ETFs, REITs, and stocks. Takes 15–30 mins with Aadhaar + PAN." />
            <Step num={2} title="Keep ₹20,000 Liquid (Emergency)" desc="Transfer this to a high-interest savings account (Fi Money, Jupiter, or Kotak 811 offer 3–6% on savings). Do NOT invest this." />
            <Step num={3} title="Book a 1-Year FD — ₹40,000" desc="Walk into any SBI/HDFC/ICICI branch or do it online via Net Banking. Choose ~7% rate, 1-year tenure. This is your safety buffer." />
            <Step num={4} title="Set up SIPs on Groww / Zerodha Coin — ₹10,000/month" desc="Split: ₹4,000 → Nifty 50 Index Fund | ₹3,000 → Flexi Cap Fund | ₹2,000 → Hybrid/BAF | ₹1,000 → Small Cap. Automate the date (e.g., 5th of every month)." />
            <Step num={5} title="Buy Gold ETF — ₹30,000 lump sum now" desc="Gold is near all-time highs but the macro environment supports it. Buy Nippon Gold ETF or LIC Gold ETF via your Demat. Set a SIP of ₹1,500/month for the remaining ₹15,000." />
            <Step num={6} title="Buy Nifty ETF + 2-3 Stocks — ₹60,000 (staggered)" desc="Don't invest all at once. Buy ₹20,000 now, ₹20,000 next month, ₹20,000 month after. Focus on Nifty BeES + 1–2 banking stocks (now on discount) + 1 pharma stock." />
            <Step num={7} title="Buy REITs — ₹15,000" desc="Embassy REIT or Mindspace REIT from NSE. They're currently corrected. Hold for rental income + appreciation." />
            <Step num={8} title="Review Every 6 Months — Don't Panic Daily" desc="Set reminders for September 2026 and March 2027. Rebalance if any one asset goes above 40% of your portfolio. Ignore daily market noise." />
            <TipBox>
              <strong className="text-blue-300">⏱️ Time to set this up:</strong> 1–2 hours total. Everything can be done from your phone. Platforms: Groww, Zerodha, or Angel One.
            </TipBox>
            <WarnBox>
              <strong>⚠️ Disclaimer:</strong> This is general financial information, not personalised advice. Claude is not a SEBI-registered advisor. Please consult a certified financial planner before investing.
            </WarnBox>
          </div>
        )}
      </div>
    </div>
  );
}
