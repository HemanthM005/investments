// Next.js 16 renamed `middleware.ts` to `proxy.ts`. Gates the whole app
// behind a single password when APP_PASSWORD is set.
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, isAuthed, authEnabled } from '@/lib/auth';

// Paths that must stay reachable while logged out.
const PUBLIC_PATHS = ['/login', '/api/login'];

export async function proxy(request: NextRequest) {
  if (!authEnabled()) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (await isAuthed(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
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
  // Everything except Next internals and static files.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|woff2?)$).*)'],
};
