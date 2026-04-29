import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DEMO = process.env.DEMO_MODE === 'true';
const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, DEMO ? 'daily-planner.example.json' : 'daily-planner.json');
const EXAMPLE = path.join(DATA_DIR, 'daily-planner.example.json');
const BAK = FILE + '.bak';

type PlannerData = {
  items: unknown[];
  planner_logs: unknown[];
};

const EMPTY: PlannerData = { items: [], planner_logs: [] };

function readFile(): PlannerData {
  try {
    // If real file doesn't exist, fall back to example
    const src = fs.existsSync(FILE) ? FILE : EXAMPLE;
    if (!fs.existsSync(src)) return { ...EMPTY };
    return { ...EMPTY, ...JSON.parse(fs.readFileSync(src, 'utf-8')) };
  } catch {
    return { ...EMPTY };
  }
}

// Atomic write: one backup (.bak), then rename-swap.
function writeFile(data: PlannerData) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(FILE)) fs.copyFileSync(FILE, BAK);
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, FILE);
}

// GET /api/planner?section=items|planner_logs  →  { data: [...] }
// GET /api/planner                             →  full { items, planner_logs }
export async function GET(req: Request) {
  const section = new URL(req.url).searchParams.get('section') as keyof PlannerData | null;
  const file = readFile();
  if (section && section in file) return NextResponse.json({ data: file[section] });
  return NextResponse.json(file);
}

// POST /api/planner  { section: 'items'|'planner_logs', data: [...] }
// POST /api/planner  { sections: { items?: [...], planner_logs?: [...] } }
export async function POST(req: Request) {
  try {
    const body = await req.json() as
      | { section: keyof PlannerData; data: unknown[] }
      | { sections: Partial<PlannerData> };

    if (DEMO) return NextResponse.json({ ok: true });

    const file = readFile();

    if ('sections' in body) {
      for (const [sec, data] of Object.entries(body.sections)) {
        if (sec in EMPTY) (file as Record<string, unknown>)[sec] = data ?? [];
      }
    } else {
      const { section, data } = body;
      if (!(section in EMPTY)) return NextResponse.json({ ok: false, error: 'Unknown section' }, { status: 400 });
      (file as Record<string, unknown>)[section] = data ?? [];
    }

    writeFile(file);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
