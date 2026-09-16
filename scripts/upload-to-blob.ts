/**
 * One-time (re-runnable) upload of the local JSON documents into the private
 * Vercel Blob store that production reads from.
 *
 * Local files are only ever READ — never modified.
 *
 * Usage:
 *   set -a && . ./.env.local && set +a
 *   npx tsx scripts/upload-to-blob.ts            # upload real data
 *   npx tsx scripts/upload-to-blob.ts --examples # upload the sample data instead
 */
import fs from 'fs';
import path from 'path';
import { put, get } from '@vercel/blob';

const useExamples = process.argv.includes('--examples');

const DOCS = useExamples
  ? ['portfolio.example.json', 'daily-tracker.example.json', 'daily-planner.example.json']
  : ['portfolio.json', 'daily-tracker.json', 'daily-planner.json'];

// Sample data is uploaded under the real document names so the app finds it.
const targetName = (f: string) => f.replace('.example', '');

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('BLOB_READ_WRITE_TOKEN not set — run: set -a && . ./.env.local && set +a');
  }

  for (const file of DOCS) {
    const src = path.join(process.cwd(), 'data', file);
    if (!fs.existsSync(src)) {
      console.log(`  skip     ${file} (not present locally)`);
      continue;
    }

    const raw = fs.readFileSync(src, 'utf-8');
    const parsed = JSON.parse(raw); // fail loudly rather than upload corrupt JSON
    const counts = Object.entries(parsed)
      .map(([k, v]) => `${k}:${Array.isArray(v) ? v.length : '·'}`)
      .join(' ');

    const dest = targetName(file);
    await put(dest, raw, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });

    // Read back and compare so a silent truncation can't go unnoticed
    const res = await get(dest, { access: 'private', useCache: false });
    const back = res?.stream ? await new Response(res.stream).text() : '';
    const ok = JSON.stringify(JSON.parse(back)) === JSON.stringify(parsed);

    console.log(`  ${ok ? 'uploaded' : 'MISMATCH'} ${dest.padEnd(22)} ${counts}`);
    if (!ok) process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('Upload failed:', e.message);
  process.exit(1);
});
