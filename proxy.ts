// Next.js 16 renamed `middleware.ts` to `proxy.ts`. Gates the whole app
// behind a per-user password and tells downstream routes who is signed in.
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, USER_HEADER, userFromCookie, authEnabled } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/api/login'];

export async function proxy(request: NextRequest) {
  // Never let a client supply its own identity header.
  const headers = new Headers(request.headers);
  headers.delete(USER_HEADER);

  if (!authEnabled()) return NextResponse.next({ request: { headers } });

  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next({ request: { headers } });
  }

  const user = await userFromCookie(request.cookies.get(SESSION_COOKIE)?.value);
  if (user) {
    headers.set(USER_HEADER, user);
    return NextResponse.next({ request: { headers } });
  }

  // API calls get a JSON 401 so the client shows a real error instead of
  // trying to parse an HTML login page.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const login = new URL('/login', request.url);
  login.searchParams.set('next', pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?)$).*)'],
};
