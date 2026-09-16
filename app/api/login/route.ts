import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionToken, verifyCredentials, authEnabled } from '@/lib/auth';
import { clientKey, retryAfterMs, recordFailure, recordSuccess } from '@/lib/loginLimit';

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(req: Request) {
  if (!authEnabled()) {
    return NextResponse.json({ ok: false, error: 'Auth is not configured' }, { status: 400 });
  }

  // Throttle before doing any work — a short PIN is only safe if guessing is slow
  const key = clientKey(req);
  const wait = retryAfterMs(key);
  if (wait > 0) {
    const seconds = Math.ceil(wait / 1000);
    return NextResponse.json(
      { ok: false, error: `Too many attempts. Try again in ${seconds}s.` },
      { status: 429, headers: { 'Retry-After': String(seconds) } }
    );
  }

  let password = '';
  let username = '';
  try {
    ({ password = '', username = '' } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }

  const user =
    typeof password === 'string' && typeof username === 'string'
      ? await verifyCredentials(username, password)
      : null;
  if (!user) {
    recordFailure(key);
    // Deliberately vague, and slowed slightly to blunt brute-force attempts.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ ok: false, error: 'Incorrect username or password' }, { status: 401 });
  }

  recordSuccess(key);
  const res = NextResponse.json({ ok: true, user: user.name });
  res.cookies.set(SESSION_COOKIE, await sessionToken(user.name), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_YEAR, // long-lived so the phone app isn't constantly logging in
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
