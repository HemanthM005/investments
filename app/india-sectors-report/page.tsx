'use client';

import { useState } from 'react';

type SectionId = 'defence' | 'solar' | 'ev' | 'hydrogen' | 'deeptech' | 'overview';

interface Company {
  name: string;
  ticker: string;
  type: string;
  desc: string;
  metrics: { k: string; v: string; up?: boolean }[];
  ratings: { label: string; value: string; pct: number; color: string }[];
  tags: { text: string; variant: 'green' | 'yellow' | 'red' }[];
  links: { screener: string; mc: string; nse: string };
  reportLink?: string;
}

interface SectorSection {
  id: SectionId;
  icon: string;
  title: string;
  tagline: string;
  badge: string;
  overview: string;
  companies: Company[];
  risks: string;
  catalysts: string;
}

const SECTORS: SectorSection[] = [
  {
    id: 'defence',
    icon: '🛡️',
    title: 'Defence Sector',
    tagline: 'Backed by ₹6.81L Cr budget, Atmanirbhar Bharat push, import bans on 400+ items, and surging exports',
    badge: 'High Conviction',
    overview: "India's defence sector targets $26 billion in aerospace & defence manufacturing turnover and ₹50,000 Cr in annual exports by 2029. With import restrictions on 400+ items, domestic manufacturers enjoy a near-captive market and multi-year order books. The Nifty India Defence Index surged 22.29% from Budget 2025 to Budget 2026, with top stock MTAR up +51%.",
    companies: [
      { name: 'Hindustan Aeronautics Ltd', ticker: 'HAL', type: 'PSU · Aerospace & Fighter Aircraft Manufacturing', desc: "India's largest aerospace & defence manufacturer. Makes Tejas fighter jets, ALH Dhruv helicopters, Sukhoi-30MKIs, and provides MRO services to all Indian armed forces branches. Order book of ₹1,89,300 Cr as of April 2025.", metrics: [{ k: 'Order Book', v: '₹1,89,300 Cr', up: true }, { k: 'Key Contracts', v: '156 LCH Prachand' }], ratings: [{ label: 'Growth', value: '9/10', pct: 90, color: '#10b981' }, { label: 'Risk', value: 'Low', pct: 25, color: '#f6c90e' }], tags: [{ text: 'Fighter Jets', variant: 'green' }, { text: 'Helicopters', variant: 'green' }, { text: 'MRO', variant: 'green' }], links: { screener: 'https://www.screener.in/company/HAL/', mc: 'https://www.moneycontrol.com/india/stockpricequote/defence/hindustanaeronauticslimited/HAL', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=HAL' } },
      { name: 'Bharat Electronics Ltd', ticker: 'BEL', type: 'PSU · Defence Electronics & Radar Systems', desc: "Critical player in India's defence electronics ecosystem. Produces radar systems, fire control, weapon systems, EW, and network-centric solutions. Order book of ₹71,650 Cr represents 3x annual revenue — excellent execution visibility.", metrics: [{ k: 'Order Book FY25', v: '₹71,650 Cr', up: true }, { k: 'Revenue FY25', v: '₹23,024 Cr' }, { k: 'OB Growth', v: '+12% YoY', up: true }], ratings: [{ label: 'Growth', value: '8.5/10', pct: 85, color: '#10b981' }, { label: 'Stability', value: '9/10', pct: 90, color: '#4f8ef7' }], tags: [{ text: 'Radar', variant: 'green' }, { text: 'EW Systems', variant: 'green' }, { text: '3x Revenue', variant: 'yellow' }], links: { screener: 'https://www.screener.in/company/BEL/', mc: 'https://www.moneycontrol.com/india/stockpricequote/defence/bharatelectronicslimited/BEL', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=BEL' } },
      { name: 'Bharat Dynamics Ltd', ticker: 'BDL', type: 'PSU · Missiles & Underwater Weapons', desc: "India's primary manufacturer of guided missiles, torpedoes, and underwater weapons. Key beneficiary of India's push to indigenise missile technology — supplying Akash, Astra, and Helina systems to the armed forces.", metrics: [{ k: 'Products', v: 'Akash, Astra' }, { k: 'Govt Support', v: 'Very High', up: true }], ratings: [{ label: 'Growth', value: '8/10', pct: 80, color: '#10b981' }, { label: 'Stability', value: '8/10', pct: 82, color: '#4f8ef7' }], tags: [{ text: 'Missiles', variant: 'green' }, { text: 'Torpedoes', variant: 'green' }, { text: 'Strategic', variant: 'green' }], links: { screener: 'https://www.screener.in/company/BDL/', mc: 'https://www.moneycontrol.com/india/stockpricequote/defence/bharatdynamicslimited/BDL', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=BDL' } },
      { name: 'Mazagon Dock Shipbuilders', ticker: 'MAZDOCK', type: 'PSU · Naval Shipbuilding (Submarines & Warships)', desc: "India's premier shipyard building Scorpene-class submarines and warships for the Indian Navy. With P-17A frigates and future submarine programs in the pipeline, MDL has a multi-decade order visibility.", metrics: [{ k: 'Specialty', v: 'Submarines' }, { k: 'Pipeline', v: 'Multi-decade', up: true }], ratings: [{ label: 'Growth', value: '8.3/10', pct: 83, color: '#10b981' }, { label: 'Stability', value: '8.5/10', pct: 85, color: '#4f8ef7' }], tags: [{ text: 'Submarines', variant: 'green' }, { text: 'Warships', variant: 'green' }, { text: 'Frigates', variant: 'green' }], links: { screener: 'https://www.screener.in/company/MAZDOCK/', mc: 'https://www.moneycontrol.com/india/stockpricequote/defence/mazagondockshipbuilderslimited/MDS', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=MAZDOCK' } },
      { name: 'MTAR Technologies', ticker: 'MTAR', type: 'Private · Precision Engineering (Defence, Space, Nuclear)', desc: 'Best-performing defence stock (+51% in FY25-26). Makes precision components for defence, ISRO space missions, and civil nuclear programs. Expanding into clean energy (Bloom Energy USA) and Oil & Gas (Weatherford). Clear multi-year growth roadmap.', metrics: [{ k: 'Stock Return', v: '+51% FY25-26', up: true }, { k: 'Clients', v: 'ISRO, DRDO, Bloom' }], ratings: [{ label: 'Growth', value: '9.2/10', pct: 92, color: '#10b981' }, { label: 'Risk', value: 'Medium', pct: 50, color: '#ef4444' }], tags: [{ text: 'Precision Mfg', variant: 'green' }, { text: 'Space', variant: 'green' }, { text: 'Top Performer', variant: 'yellow' }], links: { screener: 'https://www.screener.in/company/MTAR/', mc: 'https://www.moneycontrol.com/india/stockpricequote/defence/mtartechnologieslimited/MTAR', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=MTAR' } },
      { name: 'Garden Reach Shipbuilders (GRSE)', ticker: 'GRSE', type: 'PSU · Naval Shipbuilding (Patrol Vessels, Frigates)', desc: '+43% gain in FY25-26. Builds patrol vessels, frigates, and survey ships. Revenue +45% YoY and PAT +57% in Q2 FY26. Order book of ₹20,206 Cr with 17% non-defence diversification.', metrics: [{ k: 'Stock Return', v: '+43% FY25-26', up: true }, { k: 'Order Book', v: '₹20,206 Cr', up: true }], ratings: [{ label: 'Growth', value: '8.7/10', pct: 87, color: '#10b981' }], tags: [{ text: 'Shipbuilding', variant: 'green' }, { text: 'Corvettes', variant: 'green' }, { text: '+43% Return', variant: 'yellow' }], links: { screener: 'https://www.screener.in/company/GRSE/', mc: 'https://www.moneycontrol.com/india/stockpricequote/defence/gardenreachshipbuilders/GRS', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=GRSE' } },
      { name: 'Solar Industries India', ticker: 'SOLARINDS', type: 'Private · Explosives, Ammunition & Defence Propellants', desc: "India's largest explosives manufacturer and biggest supplier of ammunition to the armed forces. Delivers rockets, propellants, and warheads. Stock rose +27% in FY25-26.", metrics: [{ k: 'Stock Return', v: '+27% FY25-26', up: true }, { k: 'Niche', v: 'Largest in India' }], ratings: [{ label: 'Growth', value: '8.2/10', pct: 82, color: '#10b981' }], tags: [{ text: 'Ammunition', variant: 'green' }, { text: 'Explosives', variant: 'green' }, { text: 'Rockets', variant: 'green' }], links: { screener: 'https://www.screener.in/company/SOLARINDS/', mc: 'https://www.moneycontrol.com/india/stockpricequote/chemicals/solarindustriesindia/SII', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=SOLARINDS' } },
      { name: 'Data Patterns (India)', ticker: 'DATAPATT', type: 'Private · Defence Electronics (Radar, Avionics, Space)', desc: 'Specialised in mission-critical defence electronics for aerospace, naval, and communication systems. Supplies DRDO, HAL, and ISRO. Strong R&D, higher content-per-platform model, and growing demand for radar/avionics make it a key mid-cap play.', metrics: [{ k: 'Clients', v: 'DRDO, HAL, ISRO' }, { k: 'Type', v: 'Mid-cap Private' }], ratings: [{ label: 'Growth', value: '8.5/10', pct: 85, color: '#10b981' }, { label: 'Risk', value: 'Medium', pct: 50, color: '#f6c90e' }], tags: [{ text: 'Defence Electronics', variant: 'green' }, { text: 'DRDO', variant: 'green' }, { text: 'Space', variant: 'green' }], links: { screener: 'https://www.screener.in/company/DATAPATT/', mc: 'https://www.moneycontrol.com/india/stockpricequote/defence/datapatternsindia/DATAP', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=DATAPATT' } },
      { name: 'Paras Defence & Space', ticker: 'PARAS', type: 'Private · Drones, Optics, Space & Satellite Systems', desc: 'One of the few Indian private companies in defence drones, space equipment, and high-tech optics. Works on electro-optics, surveillance drones, and satellite systems. High growth runway but small-cap with volatility.', metrics: [{ k: 'Focus', v: 'Drones + Optics' }, { k: 'Upside', v: 'Very High', up: true }], ratings: [{ label: 'Growth', value: '8.8/10', pct: 88, color: '#10b981' }, { label: 'Risk', value: 'High', pct: 70, color: '#ef4444' }], tags: [{ text: 'Drones', variant: 'green' }, { text: 'Space Optics', variant: 'green' }, { text: 'Volatile', variant: 'red' }], links: { screener: 'https://www.screener.in/company/PARAS/', mc: 'https://www.moneycontrol.com/india/stockpricequote/defence/parasdefencespacetech/PDST', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=PARAS' }, reportLink: '/paras-defence-report' },
    ],
    risks: 'Heavy dependence on government procurement cycles; long project gestation periods; policy/budget changes; delays in order execution; limited pricing flexibility vs. single buyer (GoI).',
    catalysts: '₹6.81L Cr defence budget (+9.5%); import ban on 400+ items; $26B turnover target; ₹50,000 Cr export goal by 2029; AI, drones & cyber defence expansion; global partnerships (France, Israel, Russia).',
  },
  {
    id: 'solar',
    icon: '☀️',
    title: 'Solar & Renewables',
    tagline: 'India targets 500 GW non-fossil capacity by 2030 · Solar market CAGR ~40% to ~$238B by 2030',
    badge: 'Structural Growth',
    overview: 'India\'s solar capacity has crossed 119 GW (July 2025), up from just 3 GW in 2014. Module manufacturing capacity nearly doubled to 74 GW in a single year. PLI schemes, PM Surya Ghar Yojana, and ALMM rules (mandating domestic cells from 2026) are creating massive domestic demand tailwinds.',
    companies: [
      { name: 'Waaree Energies', ticker: 'WAAREEENR', type: "Private · Solar Module Manufacturing (Largest in India)", desc: "India's largest solar module manufacturer with 12 GW production capacity across four advanced facilities. Strong beneficiary of ALMM rules requiring certified domestic modules for government projects.", metrics: [{ k: 'Capacity', v: '12 GW Modules', up: true }, { k: 'Plants', v: '4 Facilities' }], ratings: [{ label: 'Growth', value: '9/10', pct: 90, color: '#f6c90e' }], tags: [{ text: 'Module Mfg', variant: 'green' }, { text: 'ALMM', variant: 'green' }, { text: 'Market Leader', variant: 'yellow' }], links: { screener: 'https://www.screener.in/company/WAAREEENR/', mc: 'https://www.moneycontrol.com/india/stockpricequote/power/waareeenergies/WE', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=WAAREEENR' } },
      { name: 'Adani Green Energy', ticker: 'ADANIGREEN', type: 'Adani Group · Large-Scale Solar & Wind Generation', desc: "India's largest renewable energy developer. Operational capacity grew 30% YoY to 14,243 MW in FY25. Building the world's largest renewable park at Khavda, Gujarat (538 sq km, targeting 30 GW). Note: Governance concerns following Nov 2025 U.S. indictment — monitor closely.", metrics: [{ k: 'Op. Capacity', v: '14,243 MW', up: true }, { k: 'YoY Capacity', v: '+30%', up: true }], ratings: [{ label: 'Growth', value: '8.8/10', pct: 88, color: '#f6c90e' }, { label: 'Risk', value: 'Med-High', pct: 65, color: '#ef4444' }], tags: [{ text: 'Utility Solar', variant: 'green' }, { text: 'Wind', variant: 'green' }, { text: 'Governance Risk', variant: 'red' }], links: { screener: 'https://www.screener.in/company/ADANIGREEN/', mc: 'https://www.moneycontrol.com/india/stockpricequote/power/adanigreenenergyltd/AGE', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=ADANIGREEN' } },
      { name: 'Tata Power', ticker: 'TATAPOWER', type: 'Tata Group · Integrated Power (Solar, Wind, EV Charging)', desc: "India's most trusted energy brand with 10 GW+ renewable capacity. Growing in rooftop solar, utility-scale projects, and EV charging. 3-year stock return of 70%+. Tata's governance track record makes it the most reliable renewable pick for conservative investors.", metrics: [{ k: 'Renewable Cap', v: '10 GW+', up: true }, { k: '3-yr Return', v: '~70%', up: true }], ratings: [{ label: 'Growth', value: '8/10', pct: 80, color: '#f6c90e' }, { label: 'Stability', value: '9/10', pct: 90, color: '#10b981' }], tags: [{ text: 'Rooftop Solar', variant: 'green' }, { text: 'EV Charging', variant: 'green' }, { text: 'Tata Safety', variant: 'yellow' }], links: { screener: 'https://www.screener.in/company/TATAPOWER/', mc: 'https://www.moneycontrol.com/india/stockpricequote/power/tatapower/TPC', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=TATAPOWER' } },
      { name: 'Premier Energies', ticker: 'PREMIENRG', type: 'Private · Solar Cell & Module Manufacturing (TOPCon)', desc: '"Mission 2028" targets ₹125 Bn capex for 10 GW fully integrated value chain. JV with Taiwan\'s SAS for 2 GW wafer plant by June 2026. FY25 capacity: 5.1 GW modules + 3.2 GW cells.', metrics: [{ k: 'Module Cap FY25', v: '5.1 GW', up: true }, { k: 'Mission 2028', v: '10 GW target', up: true }], ratings: [{ label: 'Growth', value: '9.3/10', pct: 93, color: '#f6c90e' }], tags: [{ text: 'TOPCon Tech', variant: 'green' }, { text: 'Integrated Mfg', variant: 'green' }, { text: 'High Growth', variant: 'yellow' }], links: { screener: 'https://www.screener.in/company/PREMIENRG/', mc: 'https://www.moneycontrol.com/india/stockpricequote/power/premierenergies/PE', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=PREMIENRG' } },
      { name: 'NTPC Green Energy', ticker: 'NTPCGREEN', type: 'PSU · Utility-Scale Solar & Wind (NTPC Subsidiary)', desc: "NTPC's dedicated renewable arm with ~2,900 MW commercial capacity. Operates large solar projects in Rajgarh, Bhadla, Fatehgarh, and more. Backed by NTPC's balance sheet and the government's renewable energy mandate.", metrics: [{ k: 'Operational Cap', v: '~2,900 MW', up: true }, { k: 'Parent', v: 'NTPC (PSU)' }], ratings: [{ label: 'Stability', value: '8.8/10', pct: 88, color: '#10b981' }], tags: [{ text: 'PSU-Backed', variant: 'green' }, { text: 'Utility Scale', variant: 'green' }, { text: 'Low Risk', variant: 'green' }], links: { screener: 'https://www.screener.in/company/NTPCGREEN/', mc: 'https://www.moneycontrol.com/india/stockpricequote/power/ntpcgreenenergyltd/NGE', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=NTPCGREEN' } },
      { name: 'Suzlon Energy', ticker: 'SUZLON', type: 'Private · Wind & Solar Hybrid Energy', desc: 'Dominant wind energy player expanding into solar hybrids. 21 GW installed across 17 countries. Net sales rose 73.2% YoY in Q4 FY25. Registered 1,500 MW wind-solar hybrid park in Rajasthan. A powerful turnaround story.', metrics: [{ k: 'Installed Base', v: '21 GW Wind', up: true }, { k: 'Q4 FY25 Sales', v: '+73.2% YoY', up: true }], ratings: [{ label: 'Growth', value: '8.2/10', pct: 82, color: '#f6c90e' }], tags: [{ text: 'Wind Leader', variant: 'green' }, { text: 'Hybrid Parks', variant: 'green' }, { text: 'Turnaround', variant: 'yellow' }], links: { screener: 'https://www.screener.in/company/SUZLON/', mc: 'https://www.moneycontrol.com/india/stockpricequote/power/suzlonenergy/SE', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=SUZLON' } },
    ],
    risks: 'Commodity price swings (polysilicon, glass); import-dependent supply chain; interest rate sensitivity for large capital projects; policy changes on subsidies; Chinese manufacturer competition.',
    catalysts: '500 GW target by 2030; PM Surya Ghar Yojana; PLI for solar PV modules; ALMM domestic sourcing mandate (2026 onwards); India\'s 748 GW solar potential; $238B market by 2030.',
  },
  {
    id: 'ev',
    icon: '⚡',
    title: 'Electric Vehicles',
    tagline: 'India EV market growing at 40.7% CAGR · Target: 30% EV penetration by 2030 · $34.8B market in 2024',
    badge: 'Hyper Growth',
    overview: 'India sold over 2 million EVs in FY25 — an 11.5x increase over FY20. EVs now represent 8% of all automobile sales. Two-wheelers lead (50%+), followed by three-wheelers (36%). The government\'s PM E-DRIVE scheme (₹4,000 Cr) and PLI for autos are accelerating the ecosystem. Market projected at $113.99 billion by 2029 at 66.52% CAGR.',
    companies: [
      { name: 'Tata Motors', ticker: 'TATAMOTORS', type: 'Tata Group · EV Passenger Cars & Buses (Market Leader)', desc: 'Undisputed leader in India\'s electric 4-wheeler segment with 50%+ market share in FY25. Portfolio: Nexon EV, Tigor EV, and 10 new EV models planned by FY26. Major player in electric buses.', metrics: [{ k: 'EV Market Share', v: '>50% (4W)', up: true }, { k: 'New Models', v: '10 by FY26', up: true }], ratings: [{ label: 'Market Lead', value: '9/10', pct: 90, color: '#b47afc' }], tags: [{ text: 'Nexon EV', variant: 'green' }, { text: 'E-Buses', variant: 'green' }, { text: 'Dominant Player', variant: 'yellow' }], links: { screener: 'https://www.screener.in/company/TATAMOTORS/', mc: 'https://www.moneycontrol.com/india/stockpricequote/automobiles/tatamotors/TM', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=TATAMOTORS' } },
      { name: 'Mahindra & Mahindra', ticker: 'M&M', type: 'M&M Group · Electric SUVs, 3-Wheelers & Last-Mile', desc: 'Rapidly expanding EV lineup in electric SUVs and last-mile mobility. Market leader in electric 3-wheelers. ROE of 20.11% and ROCE of 14.88%. Strong global presence in North America, Italy, Japan, and South Korea.', metrics: [{ k: 'ROE', v: '20.11%', up: true }, { k: 'ROCE', v: '14.88%', up: true }], ratings: [{ label: 'Growth', value: '8.5/10', pct: 85, color: '#b47afc' }, { label: 'Stability', value: '8.8/10', pct: 88, color: '#10b981' }], tags: [{ text: 'Electric SUVs', variant: 'green' }, { text: '3-Wheelers', variant: 'green' }, { text: 'Global', variant: 'green' }], links: { screener: 'https://www.screener.in/company/M&M/', mc: 'https://www.moneycontrol.com/india/stockpricequote/automobiles/mahindramahindra/MM', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=M%26M' } },
      { name: 'Bajaj Auto', ticker: 'BAJAJ-AUTO', type: 'Private · Electric 2-Wheelers & Auto-Rickshaws', desc: 'Financially strongest EV play — debt-equity ratio of just 0.07, PAT growth 27.19% (FY24), ROE 26.51%, ROCE 33.47%. Leveraging strong dealer network for electric scooters and auto-rickshaws. Among the safest investments in the entire EV space.', metrics: [{ k: 'Debt/Equity', v: '0.07', up: true }, { k: 'ROCE', v: '33.47%', up: true }], ratings: [{ label: 'Financials', value: '9.3/10', pct: 93, color: '#b47afc' }, { label: 'Risk', value: 'Very Low', pct: 22, color: '#10b981' }], tags: [{ text: 'EV 2W', variant: 'green' }, { text: 'Auto-Rickshaw', variant: 'green' }, { text: 'Best Financials', variant: 'yellow' }], links: { screener: 'https://www.screener.in/company/BAJAJ-AUTO/', mc: 'https://www.moneycontrol.com/india/stockpricequote/automobiles/bajajauto/BA', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=BAJAJ-AUTO' } },
      { name: 'Amara Raja Energy & Mobility', ticker: 'AMARAJABAT', type: 'Private · EV Batteries, Fast Chargers & Energy Solutions', desc: 'Pure-play EV battery and charging infrastructure company. Makes battery packs for electric 3W and 2W, plus AC/DC fast chargers. PAT growth of 27.85% (FY24), ROCE of 19.81%.', metrics: [{ k: 'PAT Growth FY24', v: '+27.85%', up: true }, { k: 'ROCE', v: '19.81%', up: true }], ratings: [{ label: 'Growth', value: '8.2/10', pct: 82, color: '#b47afc' }], tags: [{ text: 'EV Batteries', variant: 'green' }, { text: 'Fast Chargers', variant: 'green' }, { text: 'Infra Play', variant: 'green' }], links: { screener: 'https://www.screener.in/company/AMARAJABAT/', mc: 'https://www.moneycontrol.com/india/stockpricequote/batteries/amararajabatteries/ARB', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=AMARAJABAT' } },
      { name: 'JBM Auto', ticker: 'JBMA', type: 'Private · Commercial Electric Vehicles (Buses & Trucks)', desc: 'One of the few companies exclusively focused on commercial electric vehicles, particularly e-buses. Strong government and State Transport partnerships. Pure-play commercial EV bet with massive demand from India\'s public transport electrification drive.', metrics: [{ k: 'Focus', v: 'E-Buses' }, { k: 'Clients', v: 'State Transport', up: true }], ratings: [{ label: 'Growth', value: '8.5/10', pct: 85, color: '#b47afc' }], tags: [{ text: 'E-Buses', variant: 'green' }, { text: 'Commercial EV', variant: 'green' }, { text: 'Pure-Play', variant: 'yellow' }], links: { screener: 'https://www.screener.in/company/JBMA/', mc: 'https://www.moneycontrol.com/india/stockpricequote/automobiles/jbmauto/JBMA', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=JBMA' } },
      { name: 'Ashok Leyland', ticker: 'ASHOKLEY', type: 'Hinduja Group · Commercial Vehicles & Electric Trucks/Buses', desc: 'Traditional CV leader carving a niche in electric buses and trucks. Strong presence in public transport electrification with established government procurement relationships and a pan-India service network.', metrics: [{ k: 'Focus', v: 'E-Buses & Trucks' }, { k: 'Network', v: 'Pan-India', up: true }], ratings: [{ label: 'Growth', value: '7.5/10', pct: 75, color: '#b47afc' }], tags: [{ text: 'E-Trucks', variant: 'green' }, { text: 'E-Buses', variant: 'green' }, { text: 'Public Transit', variant: 'green' }], links: { screener: 'https://www.screener.in/company/ASHOKLEY/', mc: 'https://www.moneycontrol.com/india/stockpricequote/automobiles/ashokleyland/AL', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=ASHOKLEY' } },
    ],
    risks: 'Battery technology disruption; consumer adoption slower than targets; charging infra gaps; semiconductor shortages; competitive pressure from Chinese OEMs; policy reversals on subsidies.',
    catalysts: 'PM E-DRIVE (₹4,000 Cr); PLI for autos; 30% EV penetration target by 2030; $113.99B market by 2029; falling battery costs; 7,432 charging stations approved; 8% EV share in Q1 2025.',
  },
  {
    id: 'hydrogen',
    icon: '💧',
    title: 'Green Hydrogen',
    tagline: 'National Green Hydrogen Mission · ₹19,744 Cr total outlay · Target 5 MT/year by 2030',
    badge: 'Early Stage / High Potential',
    overview: "India's National Green Hydrogen Mission targets 5 million MT annually by 2030, potentially reducing fossil fuel imports by ₹1 lakh Cr. Budget 2025-26 doubled annual allocation to ₹600 Cr. 2026 is the key execution-entry year for this space — still early-stage but enormous long-term potential.",
    companies: [
      { name: 'Reliance Industries', ticker: 'RELIANCE', type: 'Private · New Energy: Green Hydrogen, Solar & Batteries', desc: 'Entering green hydrogen aggressively as part of its New Energy business with Jamnagar as the hub. With massive capital allocation, technology partnerships, and diversified business lines (Jio, Retail), Reliance is the safest "big bet" on India\'s hydrogen future.', metrics: [{ k: 'Hub', v: 'Jamnagar' }, { k: 'Risk Profile', v: 'Low (Diversified)', up: true }], ratings: [{ label: 'Long-term', value: '9/10', pct: 90, color: '#10b981' }], tags: [{ text: 'Green H₂', variant: 'green' }, { text: 'New Energy', variant: 'green' }, { text: 'Safest Large Bet', variant: 'yellow' }], links: { screener: 'https://www.screener.in/company/RELIANCE/', mc: 'https://www.moneycontrol.com/india/stockpricequote/refineries/relianceindustries/RI', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=RELIANCE' } },
      { name: 'NTPC', ticker: 'NTPC', type: 'PSU · Green Hydrogen Pilot + Renewable Power', desc: 'Piloting hydrogen fuel projects and integrating green hydrogen into its renewable portfolio. FY25 net profit: ₹23,953 Cr (+22% YoY). PSU safety with renewable + hydrogen upside — one of the best risk-adjusted bets across all emerging themes.', metrics: [{ k: 'PAT FY25', v: '₹23,953 Cr', up: true }, { k: 'Q4 PAT Growth', v: '+22% YoY', up: true }], ratings: [{ label: 'Stability', value: '9.3/10', pct: 93, color: '#10b981' }], tags: [{ text: 'H₂ Pilots', variant: 'green' }, { text: 'PSU Safety', variant: 'green' }, { text: 'Dividends', variant: 'yellow' }], links: { screener: 'https://www.screener.in/company/NTPC/', mc: 'https://www.moneycontrol.com/india/stockpricequote/power/ntpc/NTPC', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=NTPC' } },
      { name: 'Adani Enterprises', ticker: 'ADANIENT', type: 'Adani Group · Green Hydrogen & New Energy Incubator', desc: 'Group incubator for green hydrogen, solar manufacturing, airports, and roads. Khavda renewable park is the anchor. High growth potential but carries Adani group governance risk premium.', metrics: [{ k: 'Focus', v: 'Green H₂ + Solar' }, { k: 'Upside', v: 'Very High', up: true }], ratings: [{ label: 'Risk', value: 'High', pct: 70, color: '#ef4444' }], tags: [{ text: 'Green H₂', variant: 'green' }, { text: 'Incubator', variant: 'green' }, { text: 'Monitor Closely', variant: 'red' }], links: { screener: 'https://www.screener.in/company/ADANIENT/', mc: 'https://www.moneycontrol.com/india/stockpricequote/misc/adanienterprises/ADE', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=ADANIENT' } },
      { name: 'Power Grid Corp of India', ticker: 'POWERGRID', type: 'PSU · Transmission Infrastructure for Renewables & H₂', desc: "Manages India's national power transmission network and is building dedicated renewable energy corridors. A highly stable, dividend-paying indirect beneficiary of both solar and green hydrogen infrastructure growth.", metrics: [{ k: 'Role', v: 'Grid Transmission' }, { k: 'Revenue', v: 'Predictable', up: true }], ratings: [{ label: 'Stability', value: '9.4/10', pct: 94, color: '#10b981' }], tags: [{ text: 'Transmission', variant: 'green' }, { text: 'Indirect Play', variant: 'green' }, { text: 'Safe Dividend', variant: 'yellow' }], links: { screener: 'https://www.screener.in/company/POWERGRID/', mc: 'https://www.moneycontrol.com/india/stockpricequote/power/powergridcorporationofindia/PG', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=POWERGRID' } },
    ],
    risks: 'High production costs; limited storage & distribution infrastructure; long payback periods; competition from cheap fossil fuels; electrolyzer technology not yet commercially scaled.',
    catalysts: 'National Green Hydrogen Mission (₹19,744 Cr total); 5 MT/year target by 2030; ₹1 lakh Cr fossil fuel import reduction; 2026 execution phase starting; global export potential; improving electrolyzer costs.',
  },
  {
    id: 'deeptech',
    icon: '🚀',
    title: 'Space & Deep Tech',
    tagline: 'ISRO private sector opening · Semiconductor PLI · Drone warfare demand · AI infrastructure boom',
    badge: 'Frontier Growth',
    overview: "India's space sector is now liberalised for private players post-ISRO reform. Semiconductor PLI is attracting global manufacturers. Drone warfare demand has exploded. These sectors offer the highest upside potential but require a long-term investment horizon and tolerance for higher volatility.",
    companies: [
      { name: 'MTAR Technologies', ticker: 'MTAR', type: 'Private · Precision Mfg for Aerospace, Nuclear & Space', desc: "India's only listed precision parts supplier to ISRO, DRDO, Bloom Energy (USA), and the nuclear energy sector. Best-performing defence+space stock in FY25-26 (+51%). New Hyderabad facility and Oil & Gas diversification (Weatherford) add further revenue legs.", metrics: [{ k: 'Clients', v: 'ISRO, DRDO, Bloom' }, { k: 'Stock Return', v: '+51% FY25-26', up: true }], ratings: [{ label: 'Growth', value: '9.3/10', pct: 93, color: '#b47afc' }], tags: [{ text: 'Space', variant: 'green' }, { text: 'Nuclear', variant: 'green' }, { text: 'Top Performer', variant: 'yellow' }], links: { screener: 'https://www.screener.in/company/MTAR/', mc: 'https://www.moneycontrol.com/india/stockpricequote/defence/mtartechnologieslimited/MTAR', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=MTAR' } },
      { name: 'Paras Defence & Space', ticker: 'PARAS', type: 'Private · Drones, Space Optics & Satellite Systems', desc: 'Unique private-sector position in both defence drones and space technology. Focus on electro-optics, surveillance drones, and satellite systems. High growth runway as India\'s space sector opens up.', metrics: [{ k: 'Focus', v: 'Optics + Drones' }, { k: 'Upside', v: 'Very High', up: true }], ratings: [{ label: 'Growth', value: '9/10', pct: 90, color: '#b47afc' }, { label: 'Risk', value: 'High', pct: 72, color: '#ef4444' }], tags: [{ text: 'Space Optics', variant: 'green' }, { text: 'Drones', variant: 'green' }, { text: 'Volatile', variant: 'red' }], links: { screener: 'https://www.screener.in/company/PARAS/', mc: 'https://www.moneycontrol.com/india/stockpricequote/defence/parasdefencespacetech/PDST', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=PARAS' }, reportLink: '/paras-defence-report' },
      { name: 'Zen Technologies', ticker: 'ZENTEC', type: 'Private · Combat Training Simulators & Anti-Drone Systems', desc: 'Niche leader in defence simulators for combat training and counter-drone (C-UAS) technology — both extremely high-demand areas following recent conflicts globally. Compelling pure-play as India modernises training infrastructure.', metrics: [{ k: 'Niche', v: 'Simulators' }, { k: 'New Area', v: 'Anti-Drone', up: true }], ratings: [{ label: 'Growth', value: '8.5/10', pct: 85, color: '#b47afc' }], tags: [{ text: 'Simulators', variant: 'green' }, { text: 'Anti-Drone', variant: 'green' }, { text: 'Niche Leader', variant: 'yellow' }], links: { screener: 'https://www.screener.in/company/ZENTEC/', mc: 'https://www.moneycontrol.com/india/stockpricequote/defence/zentechnologies/ZT', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=ZENTEC' } },
      { name: 'Astra Microwave Products', ticker: 'ASTRAMICRO', type: 'Private · RF & Microwave Components (Radar, Space, EW)', desc: 'Specialises in RF/microwave sub-systems used in defence, space, and missile programs. Gained ~25% in FY25-26. Beneficiary of India\'s radar modernisation and growing ISRO launch cadence.', metrics: [{ k: 'Stock Return', v: '~25% FY25-26', up: true }, { k: 'Clients', v: 'DRDO, ISRO' }], ratings: [{ label: 'Growth', value: '8/10', pct: 80, color: '#b47afc' }], tags: [{ text: 'RF/Microwave', variant: 'green' }, { text: 'Radar Tech', variant: 'green' }, { text: 'Space', variant: 'green' }], links: { screener: 'https://www.screener.in/company/ASTRAMICRO/', mc: 'https://www.moneycontrol.com/india/stockpricequote/defence/astramicrowaveproducts/AMP', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=ASTRAMICRO' } },
    ],
    risks: 'Small-cap volatility; concentrated client base; long order cycles; technology disruption; limited liquidity; global competition in semiconductors & space; regulatory changes in ISRO policies.',
    catalysts: 'ISRO private sector opening; Semiconductor PLI; India\'s drone warfare demand; AI adoption; space startup funding; global partnerships in defence tech; anti-drone market boom post-Ukraine conflict.',
  },
];

const OVERVIEW_ROWS = [
  { company: 'HAL', link: 'https://www.screener.in/company/HAL/', sector: 'Defence', growth: '★★★★★', risk: 'Low', riskType: 'bull', horizon: '3-7 yrs', outlook: 'Bullish', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=HAL' },
  { company: 'BEL', link: 'https://www.screener.in/company/BEL/', sector: 'Defence Electronics', growth: '★★★★★', risk: 'Low', riskType: 'bull', horizon: '3-7 yrs', outlook: 'Bullish', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=BEL' },
  { company: 'MTAR Technologies', link: 'https://www.screener.in/company/MTAR/', sector: 'Defence/Space/Nuclear', growth: '★★★★★', risk: 'Medium', riskType: 'caut', horizon: '3-5 yrs', outlook: 'Strong Buy', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=MTAR' },
  { company: 'GRSE', link: 'https://www.screener.in/company/GRSE/', sector: 'Naval Shipbuilding', growth: '★★★★☆', risk: 'Low', riskType: 'bull', horizon: '3-7 yrs', outlook: 'Bullish', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=GRSE' },
  { company: 'Paras Defence', link: '/paras-defence-report', sector: 'Drones/Space', growth: '★★★★★', risk: 'High', riskType: 'risk', horizon: '5-10 yrs', outlook: 'Speculative', outlookType: 'caut', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=PARAS', reportLink: '/paras-defence-report' },
  { company: 'Mazagon Dock', link: 'https://www.screener.in/company/MAZDOCK/', sector: 'Naval Shipbuilding', growth: '★★★★☆', risk: 'Low', riskType: 'bull', horizon: '5-10 yrs', outlook: 'Bullish', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=MAZDOCK' },
  { company: 'BDL', link: 'https://www.screener.in/company/BDL/', sector: 'Missiles', growth: '★★★★☆', risk: 'Low', riskType: 'bull', horizon: '5-10 yrs', outlook: 'Bullish', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=BDL' },
  { company: 'Waaree Energies', link: 'https://www.screener.in/company/WAAREEENR/', sector: 'Solar Manufacturing', growth: '★★★★★', risk: 'Medium', riskType: 'caut', horizon: '3-5 yrs', outlook: 'Bullish', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=WAAREEENR' },
  { company: 'Premier Energies', link: 'https://www.screener.in/company/PREMIENRG/', sector: 'Solar Mfg (TOPCon)', growth: '★★★★★', risk: 'Medium', riskType: 'caut', horizon: '3-5 yrs', outlook: 'Strong Buy', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=PREMIENRG' },
  { company: 'Tata Power', link: 'https://www.screener.in/company/TATAPOWER/', sector: 'Solar/Wind/EV Charging', growth: '★★★★☆', risk: 'Low', riskType: 'bull', horizon: '3-7 yrs', outlook: 'Bullish', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=TATAPOWER' },
  { company: 'Adani Green Energy', link: 'https://www.screener.in/company/ADANIGREEN/', sector: 'Solar/Wind', growth: '★★★★★', risk: 'High', riskType: 'risk', horizon: '5-10 yrs', outlook: 'Caution', outlookType: 'caut', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=ADANIGREEN' },
  { company: 'Suzlon Energy', link: 'https://www.screener.in/company/SUZLON/', sector: 'Wind/Hybrid', growth: '★★★★☆', risk: 'Medium', riskType: 'caut', horizon: '3-5 yrs', outlook: 'Bullish', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=SUZLON' },
  { company: 'NTPC Green', link: 'https://www.screener.in/company/NTPCGREEN/', sector: 'Utility Solar/H₂', growth: '★★★☆☆', risk: 'Low', riskType: 'bull', horizon: '5-10 yrs', outlook: 'Stable', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=NTPCGREEN' },
  { company: 'Tata Motors', link: 'https://www.screener.in/company/TATAMOTORS/', sector: 'EV (4W, Buses)', growth: '★★★★★', risk: 'Medium', riskType: 'caut', horizon: '3-7 yrs', outlook: 'Bullish', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=TATAMOTORS' },
  { company: 'Mahindra & Mahindra', link: 'https://www.screener.in/company/M&M/', sector: 'EV (SUV, 3W)', growth: '★★★★☆', risk: 'Low', riskType: 'bull', horizon: '3-7 yrs', outlook: 'Bullish', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=M%26M' },
  { company: 'Bajaj Auto', link: 'https://www.screener.in/company/BAJAJ-AUTO/', sector: 'EV (2W)', growth: '★★★★☆', risk: 'Very Low', riskType: 'bull', horizon: '3-5 yrs', outlook: 'Strong Buy', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=BAJAJ-AUTO' },
  { company: 'Amara Raja Energy', link: 'https://www.screener.in/company/AMARAJABAT/', sector: 'EV Batteries', growth: '★★★★☆', risk: 'Medium', riskType: 'caut', horizon: '3-7 yrs', outlook: 'Bullish', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=AMARAJABAT' },
  { company: 'Reliance Industries', link: 'https://www.screener.in/company/RELIANCE/', sector: 'Green H₂/New Energy', growth: '★★★★★', risk: 'Low', riskType: 'bull', horizon: '5-10 yrs', outlook: 'Strong Buy', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=RELIANCE' },
  { company: 'Power Grid Corp', link: 'https://www.screener.in/company/POWERGRID/', sector: 'Transmission/Infra', growth: '★★★☆☆', risk: 'Very Low', riskType: 'bull', horizon: '5-10 yrs', outlook: 'Stable Income', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=POWERGRID' },
  { company: 'Zen Technologies', link: 'https://www.screener.in/company/ZENTEC/', sector: 'Simulators/Anti-Drone', growth: '★★★★★', risk: 'Medium', riskType: 'caut', horizon: '3-5 yrs', outlook: 'Bullish', outlookType: 'bull', nse: 'https://www.nseindia.com/get-quotes/equity?symbol=ZENTEC' },
];

const TAG_COLORS = {
  green: 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50',
  yellow: 'bg-yellow-950/60 text-yellow-400 border border-yellow-900/50',
  red: 'bg-red-950/60 text-red-400 border border-red-900/50',
};

const BADGE_COLORS = {
  bull: 'bg-emerald-950/60 text-emerald-400',
  caut: 'bg-yellow-950/60 text-yellow-400',
  risk: 'bg-red-950/60 text-red-400',
};

const MACRO_STATS = [
  { label: 'Defence Budget FY26', value: '₹6.81L Cr', sub: '+9.5% YoY', up: true },
  { label: 'Solar Installed Capacity', value: '~119 GW', sub: 'Target: 500 GW by 2030', up: true },
  { label: 'EV Sales FY25', value: '2M+ Units', sub: '+50% YoY surge', up: true },
  { label: 'Defence Exports', value: '₹16,000 Cr', sub: 'All-time high', up: true },
  { label: 'Green H₂ Mission Budget', value: '₹19,744 Cr', sub: 'Total outlay', up: false },
  { label: 'Nifty India Defence Index', value: '+22% (FY25-26)', sub: 'Top stock +51%', up: true },
];

function CompanyCard({ company }: { company: Company }) {
  return (
    <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-5 flex flex-col hover:border-indigo-500/50 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div className="font-bold text-slate-100 text-sm">{company.name}</div>
        <span className="text-xs text-indigo-400 bg-indigo-900/30 px-2 py-0.5 rounded-md ml-2 flex-shrink-0">{company.ticker}</span>
      </div>
      <div className="text-xs text-slate-500 mb-3">{company.type}</div>
      <p className="text-xs text-slate-400 leading-relaxed flex-1 mb-3">{company.desc}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {company.metrics.map((m, i) => (
          <div key={i} className="bg-[#0f1117] rounded-lg px-2.5 py-1.5 text-xs">
            <span className="text-slate-500 block">{m.k}</span>
            <span className={`font-bold text-sm ${m.up ? 'text-emerald-400' : 'text-slate-200'}`}>{m.v}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1.5 mb-3">
        {company.ratings.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-20 flex-shrink-0">{r.label}</span>
            <div className="flex-1 bg-[#2a2d3e] rounded h-1.5">
              <div className="h-1.5 rounded transition-all" style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
            </div>
            <span className="text-xs font-bold w-16 text-right" style={{ color: r.color }}>{r.value}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {company.tags.map((t, i) => (
          <span key={i} className={`text-xs px-2 py-0.5 rounded-lg ${TAG_COLORS[t.variant]}`}>{t.text}</span>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap mt-auto">
        <a href={company.links.screener} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 hover:opacity-80 transition-opacity">📊 Screener</a>
        <a href={company.links.mc} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1 rounded-lg bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 hover:opacity-80 transition-opacity">📈 Moneycontrol</a>
        <a href={company.links.nse} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1 rounded-lg bg-orange-950/40 text-orange-400 border border-orange-900/40 hover:opacity-80 transition-opacity">🏦 NSE</a>
        {company.reportLink && (
          <a href={company.reportLink} className="text-xs px-2.5 py-1 rounded-lg bg-purple-950/40 text-purple-400 border border-purple-800/50 hover:opacity-80 transition-opacity font-semibold">🛡️ Deep Dive</a>
        )}
      </div>
    </div>
  );
}

export default function IndiaSectorsReportPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('defence');

  const currentSector = SECTORS.find((s) => s.id === activeSection);

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#0d1b3e] via-[#1a1d2e] to-[#0f1117] border-b border-[#2a2d3e] px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-1.5">🇮🇳 India Emerging Sectors — Investment Report</h1>
        <p className="text-slate-400 text-sm">Defence · Solar &amp; Renewables · Electric Vehicles · Green Hydrogen · Space &amp; Deep Tech</p>
        <span className="inline-block mt-2 bg-indigo-600 text-white text-xs px-3 py-0.5 rounded-full">Updated: March 2026</span>
      </div>

      {/* Macro Stats */}
      <div className="bg-[#12151f] border-b border-[#2a2d3e] px-4 py-3 flex gap-3 overflow-x-auto">
        {MACRO_STATS.map((s, i) => (
          <div key={i} className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl px-4 py-3 min-w-[170px] flex-shrink-0">
            <div className="text-xs text-slate-500 mb-1">{s.label}</div>
            <div className={`text-base font-bold ${s.up ? 'text-emerald-400' : 'text-yellow-400'}`}>{s.value}</div>
            <div className="text-xs text-emerald-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Nav */}
      <div className="bg-[#12151f] border-b border-[#2a2d3e] px-4 py-3 flex flex-wrap gap-2">
        {SECTORS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`text-xs px-3.5 py-1.5 rounded-full border transition-all ${
              activeSection === s.id
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'border-[#2a2d3e] text-slate-400 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white'
            }`}
          >
            {s.icon} {s.title}
          </button>
        ))}
        <button
          onClick={() => setActiveSection('overview')}
          className={`text-xs px-3.5 py-1.5 rounded-full border transition-all ${
            activeSection === 'overview'
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'border-[#2a2d3e] text-slate-400 hover:bg-indigo-600 hover:border-indigo-600 hover:text-white'
          }`}
        >
          📊 Full Overview
        </button>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        {activeSection === 'overview' ? (
          <div>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#2a2d3e]">
              <span className="text-3xl">📊</span>
              <div>
                <h2 className="text-xl font-bold text-slate-100">Full Portfolio Overview <span className="text-xs bg-indigo-900/40 text-indigo-400 border border-indigo-800/40 px-2 py-0.5 rounded-lg ml-2">Master Comparison</span></h2>
                <p className="text-xs text-slate-400 mt-1">All 20 companies at a glance — click any company name to go directly to Screener.in</p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[#2a2d3e] mb-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#12151f]">
                    {['Company', 'Sector', 'Growth', 'Risk', 'Horizon', 'Outlook', 'Quick Links'].map((h) => (
                      <th key={h} className="text-left text-slate-500 font-semibold px-3 py-2.5 border-b border-[#2a2d3e]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {OVERVIEW_ROWS.map((row, i) => (
                    <tr key={i} className="border-b border-[#2a2d3e] hover:bg-[#12151f] transition-colors">
                      <td className="px-3 py-2.5"><a href={row.link} target={row.link.startsWith('/') ? '_self' : '_blank'} rel="noopener noreferrer" className="text-indigo-400 hover:underline font-semibold">{row.company}</a></td>
                      <td className="px-3 py-2.5 text-slate-300">{row.sector}</td>
                      <td className="px-3 py-2.5 text-yellow-400">{row.growth}</td>
                      <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-lg ${BADGE_COLORS[row.riskType as keyof typeof BADGE_COLORS]}`}>{row.risk}</span></td>
                      <td className="px-3 py-2.5 text-slate-400">{row.horizon}</td>
                      <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-lg ${BADGE_COLORS[row.outlookType as keyof typeof BADGE_COLORS]}`}>{row.outlook}</span></td>
                      <td className="px-3 py-2.5 flex items-center gap-2"><a href={row.nse} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">NSE ↗</a>{row.reportLink && <a href={row.reportLink} className="text-purple-400 hover:underline text-xs">🛡️ Deep Dive</a>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-gradient-to-r from-[#12203a] to-[#0f1a2a] border border-emerald-800/40 rounded-xl p-5 mb-4">
              <h3 className="text-emerald-400 font-semibold mb-3">🎯 Suggested Portfolio Allocation Approach</h3>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li><strong className="text-slate-200">Core (40-50%):</strong> HAL, BEL, Tata Power, Bajaj Auto, NTPC/NTPC Green, Power Grid — low risk, proven performers</li>
                <li><strong className="text-slate-200">Growth (30-35%):</strong> MTAR Technologies, Waaree Energies, Premier Energies, Tata Motors, M&amp;M, GRSE — higher returns with manageable risk</li>
                <li><strong className="text-slate-200">Speculative/High Upside (15-20%):</strong> Paras Defence, Zen Technologies, Amara Raja, Data Patterns — high potential, be prepared for volatility</li>
                <li><strong className="text-slate-200">Macro Hedge:</strong> Reliance Industries spans green hydrogen, telecom, and retail — provides diversification across India&apos;s future themes</li>
              </ul>
            </div>
            <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4 text-xs text-red-300/80">
              ⚠ <strong>Disclaimer:</strong> This report is for informational and educational purposes only. It is NOT financial advice or a recommendation to buy or sell any securities. Past performance does not guarantee future results. All investments carry risk. Please consult a SEBI-registered financial advisor before making any investment decisions.
            </div>
          </div>
        ) : currentSector ? (
          <div>
            {/* Sector Header */}
            <div className="flex items-start gap-4 mb-6 pb-5 border-b border-[#2a2d3e]">
              <span className="text-4xl">{currentSector.icon}</span>
              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  {currentSector.title}{' '}
                  <span className="text-xs bg-indigo-900/40 text-indigo-400 border border-indigo-800/40 px-2 py-0.5 rounded-lg">{currentSector.badge}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">{currentSector.tagline}</p>
              </div>
            </div>

            {/* Overview Box */}
            <div className="bg-gradient-to-r from-[#12203a] to-[#0f1a2a] border border-indigo-800/40 rounded-xl p-5 mb-6">
              <h3 className="text-indigo-400 font-semibold text-sm mb-2">Sector Overview</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{currentSector.overview}</p>
            </div>

            {/* Company Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              {currentSector.companies.map((company, i) => (
                <CompanyCard key={i} company={company} />
              ))}
            </div>

            {/* Risk / Catalyst */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-4">
                <h4 className="text-xs font-semibold text-red-400 mb-2">⚠ Key Risks</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{currentSector.risks}</p>
              </div>
              <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-xl p-4">
                <h4 className="text-xs font-semibold text-emerald-400 mb-2">✅ Key Catalysts</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{currentSector.catalysts}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
