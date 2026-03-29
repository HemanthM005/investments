import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'daily-tracker.json');
const BAK  = FILE + '.bak';

type TrackerData = {
  habits: unknown[];
  habit_logs: unknown[];
};

const EMPTY: TrackerData = { habits: [], habit_logs: [] };

function readFile(): TrackerData {
  try {
    if (!fs.existsSync(FILE)) return { ...EMPTY };
    return { ...EMPTY, ...JSON.parse(fs.readFileSync(FILE, 'utf-8')) };
  } catch {
    return { ...EMPTY };
  }
}

// Atomic write: one backup (.bak), then rename-swap.
function writeFile(data: TrackerData) {
  const dir = path.dirname(FILE);
  fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(FILE)) fs.copyFileSync(FILE, BAK);

  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, FILE);
}

// GET /api/habits?section=habits|habit_logs  →  { data: [...] }
// GET /api/habits                            →  full { habits, habit_logs }
export async function GET(req: Request) {
  const section = new URL(req.url).searchParams.get('section') as keyof TrackerData | null;
  const file = readFile();
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
