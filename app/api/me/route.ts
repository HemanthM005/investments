import { NextResponse } from 'next/server';
import { USER_HEADER, authEnabled } from '@/lib/auth';

/** Who is signed in. The header is set by proxy.ts from the verified cookie. */
export async function GET(req: Request) {
  return NextResponse.json({
    user: req.headers.get(USER_HEADER),
    authEnabled: authEnabled(),
  });
}
