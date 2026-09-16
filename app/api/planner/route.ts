import { NextResponse } from 'next/server';
import { readStore, writeStore } from '@/lib/storage';
import { USER_HEADER } from '@/lib/auth';

const DEMO = process.env.DEMO_MODE === 'true';
const FILE = DEMO ? 'daily-planner.example.json' : 'daily-planner.json';
const EXAMPLE = 'daily-planner.example.json';

type PlannerData = {
  items: unknown[];
  planner_logs: unknown[];
};

const EMPTY: PlannerData = { items: [], planner_logs: [] };

async function readFile(user: string | null): Promise<PlannerData> {
  const data = await readStore<Partial<PlannerData> | null>(FILE, null, user);
  // Fall back to the example when the real document does not exist yet
  if (data) return { ...EMPTY, ...data };
  return { ...EMPTY, ...(await readStore<Partial<PlannerData>>(EXAMPLE, {}, null)) };
}

async function writeFile(data: PlannerData, user: string | null) {
  await writeStore(FILE, data, user);
}

// GET /api/planner?section=items|planner_logs  →  { data: [...] }
// GET /api/planner                             →  full { items, planner_logs }
export async function GET(req: Request) {
  const section = new URL(req.url).searchParams.get('section') as keyof PlannerData | null;
  const user = req.headers.get(USER_HEADER);
  const file = await readFile(user);
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

    const user = req.headers.get(USER_HEADER);
  const file = await readFile(user);

    if ('sections' in body) {
      for (const [sec, data] of Object.entries(body.sections)) {
        if (!Array.isArray(data)) {
          return NextResponse.json(
            { ok: false, error: `Section "${sec}" must be an array, got ${typeof data}. Refusing to overwrite.` },
            { status: 400 }
          );
        }
        if (sec in EMPTY) (file as Record<string, unknown>)[sec] = data ?? [];
      }
    } else {
      const { section, data } = body;
      if (!(section in EMPTY)) return NextResponse.json({ ok: false, error: 'Unknown section' }, { status: 400 });
      // A section write REPLACES the whole array; a stray object would wipe it.
      if (!Array.isArray(data)) {
        return NextResponse.json(
          { ok: false, error: `Section "${section}" must be an array, got ${typeof data}. Refusing to overwrite.` },
          { status: 400 }
        );
      }
      (file as Record<string, unknown>)[section] = data ?? [];
    }

    await writeFile(file, user);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
