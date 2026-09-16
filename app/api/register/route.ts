import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE, sessionToken, registrationEnabled, isNameTaken,
  USERNAME_RE, minPasswordLength, safeEqual,
} from '@/lib/auth';
import { addUser } from '@/lib/userStore';
import { hashPassword } from '@/lib/password';
import { clientKey, retryAfterMs, recordFailure } from '@/lib/loginLimit';

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function GET() {
  // Lets the page show or hide itself without exposing anything else.
  return NextResponse.json({ enabled: registrationEnabled(), minLength: minPasswordLength() });
}

export async function POST(req: Request) {
  if (!registrationEnabled()) {
    return NextResponse.json({ ok: false, error: 'Registration is closed' }, { status: 403 });
  }

  // Share the login throttle so the invite code can't be brute-forced either.
  const key = clientKey(req);
  const wait = retryAfterMs(key);
  if (wait > 0) {
    const seconds = Math.ceil(wait / 1000);
    return NextResponse.json(
      { ok: false, error: `Too many attempts. Try again in ${seconds}s.` },
      { status: 429, headers: { 'Retry-After': String(seconds) } }
    );
  }

  let username = '', password = '', code = '';
  try {
    ({ username = '', password = '', code = '' } = await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
  }

  if (!safeEqual(code, process.env.REGISTER_CODE!)) {
    recordFailure(key);
    await new Promise((r) => setTimeout(r, 400));
    return NextResponse.json({ ok: false, error: 'Invalid invite code' }, { status: 401 });
  }

  const name = String(username).trim().toLowerCase();
  if (!USERNAME_RE.test(name) || name.length < 3 || name.length > 20) {
    return NextResponse.json(
      { ok: false, error: 'Username must be 3-20 characters, using a-z, 0-9, - or _' },
      { status: 400 }
    );
  }

  const min = minPasswordLength();
  if (typeof password !== 'string' || password.length < min) {
    return NextResponse.json(
      { ok: false, error: `Password must be at least ${min} characters` },
      { status: 400 }
    );
  }

  if (await isNameTaken(name)) {
    return NextResponse.json({ ok: false, error: 'That username is taken' }, { status: 409 });
  }

  await addUser({
    name,
    password: await hashPassword(password), // plaintext is never stored
    created_at: new Date().toISOString(),
  });

  // Sign the new account straight in.
  const res = NextResponse.json({ ok: true, user: name });
  res.cookies.set(SESSION_COOKIE, await sessionToken(name), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_YEAR,
  });
  return res;
}
