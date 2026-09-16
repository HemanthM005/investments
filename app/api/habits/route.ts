import { NextResponse } from 'next/server';
import { readStore, writeStore } from '@/lib/storage';
import { USER_HEADER } from '@/lib/auth';

const DEMO = process.env.DEMO_MODE === 'true';
const FILE = DEMO ? 'daily-tracker.example.json' : 'daily-tracker.json';

type TrackerData = {
  habits: unknown[];
  habit_logs: unknown[];
};

const EMPTY: TrackerData = { habits: [], habit_logs: [] };

async function readFile(user: string | null): Promise<TrackerData> {
  return { ...EMPTY, ...(await readStore<Partial<TrackerData>>(FILE, {}, user)) };
}

async function writeFile(data: TrackerData, user: string | null) {
  await writeStore(FILE, data, user);
}

// GET /api/habits?section=habits|habit_logs  →  { data: [...] }
// GET /api/habits                            →  full { habits, habit_logs }
export async function GET(req: Request) {
  const section = new URL(req.url).searchParams.get('section') as keyof TrackerData | null;
  const user = req.headers.get(USER_HEADER);
  const file = await readFile(user);
  if (section && section in file) return NextResponse.json({ data: file[section] });
  return NextResponse.json(file);
}

// POST /api/habits  { section: 'habits'|'habit_logs', data: [...] }
// POST /api/habits  { sections: { habits?: [...], habit_logs?: [...] } }
export async function POST(req: Request) {
  try {
    const body = await req.json() as
      | { section: keyof TrackerData; data: unknown[] }
      | { sections: Partial<TrackerData> };

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

    if (!DEMO) await writeFile(file, user);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
