import { NextResponse } from 'next/server';
import { readStore, writeStore } from '@/lib/storage';

const DEMO = process.env.DEMO_MODE === 'true';
const FILE = DEMO ? 'daily-planner.example.json' : 'daily-planner.json';
const EXAMPLE = 'daily-planner.example.json';

type PlannerData = {
  items: unknown[];
  planner_logs: unknown[];
};

const EMPTY: PlannerData = { items: [], planner_logs: [] };

async function readFile(): Promise<PlannerData> {
  const data = await readStore<Partial<PlannerData> | null>(FILE, null);
  // Fall back to the example when the real document does not exist yet
  if (data) return { ...EMPTY, ...data };
  return { ...EMPTY, ...(await readStore<Partial<PlannerData>>(EXAMPLE, {})) };
}

async function writeFile(data: PlannerData) {
  await writeStore(FILE, data);
}

// GET /api/planner?section=items|planner_logs  →  { data: [...] }
// GET /api/planner                             →  full { items, planner_logs }
export async function GET(req: Request) {
  const section = new URL(req.url).searchParams.get('section') as keyof PlannerData | null;
  const file = await readFile();
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

    const file = await readFile();

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
