import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'portfolio.json');

type PortfolioData = {
  investments: unknown[];
  money_records: unknown[];
  accounts: unknown[];
  expenses: unknown[];
  recurring: unknown[];
};

const EMPTY: PortfolioData = {
  investments: [],
  money_records: [],
  accounts: [],
  expenses: [],
  recurring: [],
};

function readFile(): PortfolioData {
  try {
    if (!fs.existsSync(FILE)) return { ...EMPTY };
    return { ...EMPTY, ...JSON.parse(fs.readFileSync(FILE, 'utf-8')) };
  } catch {
    return { ...EMPTY };
  }
}

function writeFile(data: PortfolioData) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// GET /api/data?section=investments  → { data: [...] }
// GET /api/data                      → full portfolio object
export async function GET(req: Request) {
  const section = new URL(req.url).searchParams.get('section') as keyof PortfolioData | null;
  const file = readFile();
  if (section && section in file) return NextResponse.json({ data: file[section] });
  return NextResponse.json(file);
}

// POST /api/data { section: 'investments', data: [...] }
export async function POST(req: Request) {
  try {
    const { section, data } = await req.json() as { section: keyof PortfolioData; data: unknown[] };
    if (!(section in EMPTY)) return NextResponse.json({ ok: false, error: 'Unknown section' }, { status: 400 });
    const file = readFile();
    file[section] = data;
    writeFile(file);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
