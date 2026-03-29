import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE = path.join(process.cwd(), 'data', 'portfolio.json');
const MAX_AUDIT = 500; // keep last 500 audit entries

type AuditEntry = {
  ts: string;
  action: string;
  section: string;
  detail?: string;
};

type PortfolioData = {
  investments: unknown[];
  money_records: unknown[];
  accounts: unknown[];
  expenses: unknown[];
  recurring: unknown[];
  audit_log: AuditEntry[];
};

const EMPTY: PortfolioData = {
  investments: [],
  money_records: [],
  accounts: [],
  expenses: [],
  recurring: [],
  audit_log: [],
};

function readFile(): PortfolioData {
  try {
    if (!fs.existsSync(FILE)) return { ...EMPTY };
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
    // Only pick known keys so stale/migrated sections are silently dropped on next write
    const result = { ...EMPTY };
    for (const key of Object.keys(EMPTY) as (keyof PortfolioData)[]) {
      if (key in parsed) (result as Record<string, unknown>)[key] = parsed[key];
    }
    return result;
  } catch {
    return { ...EMPTY };
  }
}

// Atomic write: write to .tmp then rename (POSIX rename is atomic — either
// the old file or the new file exists, never a half-written state).
// Also rotates up to 3 backups before each write so you can always recover.
function writeFile(data: PortfolioData) {
  const dir = path.dirname(FILE);
  fs.mkdirSync(dir, { recursive: true });

  // Rotate backups: .bak1 → .bak2 → .bak3
  const bak = (n: number) => `${FILE}.bak${n}`;
  if (fs.existsSync(bak(2))) fs.renameSync(bak(2), bak(3));
  if (fs.existsSync(bak(1))) fs.renameSync(bak(1), bak(2));
  if (fs.existsSync(FILE))   fs.copyFileSync(FILE, bak(1));

  // Atomic write via temp file
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, FILE); // atomic on POSIX/macOS
}

function appendAudit(file: PortfolioData, entry: AuditEntry) {
  file.audit_log = [...(file.audit_log ?? []), entry].slice(-MAX_AUDIT);
}

// Sections where mergeById is used (investments only).
// All other sections use plain overwrite so deletes always take effect.
const MERGE_SECTIONS = new Set(['investments']);

// Merge incoming array with existing array by id:
// - Preserves extra fields on existing items absent from incoming (e.g. `research`)
// - Appends file-only items not in incoming, UNLESS they are soft-deleted (_deleted:true)
//   This lets items added directly to the file survive the next auto-save cycle.
function mergeById(existing: unknown[], incoming: unknown[]): unknown[] {
  const existingMap = new Map<string, Record<string, unknown>>();
  const incomingIds = new Set<string>();

  for (const item of existing) {
    const rec = item as Record<string, unknown>;
    if (typeof rec.id === 'string') existingMap.set(rec.id, rec);
  }

  const result = incoming.map((item) => {
    const rec = item as Record<string, unknown>;
    const id = typeof rec.id === 'string' ? rec.id : null;
    if (id) incomingIds.add(id);
    const base = id ? (existingMap.get(id) ?? {}) : {};
    return { ...base, ...rec };
  });

  // Append file-only items that aren't soft-deleted tombstones
  for (const item of existing) {
    const rec = item as Record<string, unknown>;
    const id = typeof rec.id === 'string' ? rec.id : null;
    if (id && !incomingIds.has(id) && !rec._deleted) {
      result.push(rec);
    }
  }

  return result;
}

// ── GET /api/data?section=investments → { data: [...] }
// ── GET /api/data                     → full portfolio object
// ── GET /api/data?section=audit_log   → { data: [...] }
export async function GET(req: Request) {
  const section = new URL(req.url).searchParams.get('section') as keyof PortfolioData | null;
  const file = readFile();
  if (section && section in file) return NextResponse.json({ data: file[section] });
  return NextResponse.json(file);
}

// ── POST /api/data
// Single section:   { section: 'expenses', data: [...] }
// Multi-section:    { sections: { expenses: [...], money_records: [...] }, action?: '...' }
// Both write atomically in one file operation.
export async function POST(req: Request) {
  try {
    const body = await req.json() as
      | { section: keyof PortfolioData; data: unknown[]; action?: string }
      | { sections: Partial<Record<keyof PortfolioData, unknown[]>>; action?: string };

    const file = readFile();

    if ('sections' in body) {
      // Multi-section atomic update
      const { sections, action } = body;
      const changed: string[] = [];
      for (const [sec, data] of Object.entries(sections)) {
        if (sec in EMPTY && sec !== 'audit_log') {
          const existing = (file as Record<string, unknown>)[sec] as unknown[];
          (file as Record<string, unknown>)[sec] = MERGE_SECTIONS.has(sec)
            ? mergeById(existing ?? [], data ?? [])
            : (data ?? []);
          changed.push(sec);
        }
      }
      appendAudit(file, {
        ts: new Date().toISOString(),
        action: action ?? 'update',
        section: changed.join('+'),
      });
    } else {
      // Single section update
      const { section, data, action } = body;
      if (!(section in EMPTY) || section === 'audit_log') {
        return NextResponse.json({ ok: false, error: 'Unknown section' }, { status: 400 });
      }
      const existing = (file as Record<string, unknown>)[section] as unknown[];
      (file as Record<string, unknown>)[section] = MERGE_SECTIONS.has(section)
        ? mergeById(existing ?? [], data ?? [])
        : data ?? [];
      appendAudit(file, {
        ts: new Date().toISOString(),
        action: action ?? 'update',
        section,
        detail: `count:${(data as unknown[]).length}`,
      });
    }

    writeFile(file);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
