import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionToken, safeEqual, authEnabled } from '@/lib/auth';

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(req: Request) {
  if (!authEnabled()) {
    return NextResponse.json({ ok: false, error: 'Auth is not configured' }, { status: 400 });
  }

  let password = '';
  try {
    ({ password } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }

  if (typeof password !== 'string' || !safeEqual(password, process.env.APP_PASSWORD!)) {
    // Deliberately vague, and slowed slightly to blunt brute-force attempts.
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ ok: false, error: 'Incorrect password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionToken(), {
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
