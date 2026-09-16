import { NextResponse } from 'next/server';
import { readStore, writeStore } from '@/lib/storage';

const DEMO = process.env.DEMO_MODE === 'true';
const FILE = DEMO ? 'daily-tracker.example.json' : 'daily-tracker.json';

type TrackerData = {
  habits: unknown[];
  habit_logs: unknown[];
};

const EMPTY: TrackerData = { habits: [], habit_logs: [] };

async function readFile(): Promise<TrackerData> {
  return { ...EMPTY, ...(await readStore<Partial<TrackerData>>(FILE, {})) };
}

async function writeFile(data: TrackerData) {
  await writeStore(FILE, data);
}

// GET /api/habits?section=habits|habit_logs  →  { data: [...] }
// GET /api/habits                            →  full { habits, habit_logs }
export async function GET(req: Request) {
  const section = new URL(req.url).searchParams.get('section') as keyof TrackerData | null;
  const file = await readFile();
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

    if (!DEMO) await writeFile(file);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
