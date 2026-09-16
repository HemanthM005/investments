import { NextResponse } from 'next/server';
import { USER_HEADER, appUsers, primaryUser } from '@/lib/auth';
import { loadUsers, saveUsers } from '@/lib/userStore';
import { docPath, existsStore, deleteStore, USER_DOCS } from '@/lib/storage';

/** Only the first user in APP_USERS — the owner — may see or manage the list. */
function isOwner(req: Request): boolean {
  const me = req.headers.get(USER_HEADER);
  const owner = primaryUser();
  return Boolean(me && owner && me === owner);
}

export async function GET(req: Request) {
  if (!isOwner(req)) {
    return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 403 });
  }

  const envNames = new Set(appUsers().map((u) => u.name));
  const registered = await loadUsers();

  const rows = await Promise.all([
    ...appUsers().map(async (u) => ({
      name: u.name,
      source: 'env' as const,
      created_at: null as string | null,
      owner: u.name === primaryUser(),
      paths: USER_DOCS.map((d) => docPath(d, u.name)),
      hasData: (await Promise.all(USER_DOCS.map((d) => existsStore(d, u.name)))).some(Boolean),
    })),
    ...registered
      .filter((u) => !envNames.has(u.name))
      .map(async (u) => ({
        name: u.name,
        source: 'registered' as const,
        created_at: u.created_at,
        owner: false,
        paths: USER_DOCS.map((d) => docPath(d, u.name)),
        hasData: (await Promise.all(USER_DOCS.map((d) => existsStore(d, u.name)))).some(Boolean),
      })),
  ]);

  return NextResponse.json({ ok: true, users: rows, me: req.headers.get(USER_HEADER) });
}

export async function DELETE(req: Request) {
  if (!isOwner(req)) {
    return NextResponse.json({ ok: false, error: 'Not allowed' }, { status: 403 });
  }

  const url = new URL(req.url);
  const name = (url.searchParams.get('name') ?? '').trim().toLowerCase();
  const withData = url.searchParams.get('withData') === 'true';

  if (!name) return NextResponse.json({ ok: false, error: 'Missing name' }, { status: 400 });

  // Env-declared users live in an environment variable, not here.
  if (appUsers().some((u) => u.name === name)) {
    return NextResponse.json(
      { ok: false, error: 'That account comes from APP_USERS — remove it there instead.' },
      { status: 400 }
    );
  }

  const users = await loadUsers(true);
  if (!users.some((u) => u.name === name)) {
    return NextResponse.json({ ok: false, error: 'No such user' }, { status: 404 });
  }

  await saveUsers(users.filter((u) => u.name !== name));
  if (withData) await Promise.all(USER_DOCS.map((d) => deleteStore(d, name)));

  return NextResponse.json({ ok: true, deletedData: withData });
}
