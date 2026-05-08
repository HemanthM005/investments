import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { UsageEntry } from '@/lib/ai/usage';

const USAGE_PATH = path.join(process.cwd(), 'data', 'ai-usage.json');

export async function GET() {
  try {
    const raw = await fs.readFile(USAGE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    const entries: UsageEntry[] = Array.isArray(parsed) ? parsed : [];
    return NextResponse.json({ entries });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ entries: [] });
    }
    return NextResponse.json({ entries: [], error: String(err) }, { status: 500 });
  }
}
