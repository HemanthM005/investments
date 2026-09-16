import { NextResponse } from 'next/server';
import { USER_HEADER, authEnabled, primaryUser } from '@/lib/auth';

/** Who is signed in. The header is set by proxy.ts from the verified cookie. */
export async function GET(req: Request) {
  const user = req.headers.get(USER_HEADER);
  return NextResponse.json({
    user,
    authEnabled: authEnabled(),
    isOwner: Boolean(user && user === primaryUser()),
  });
}
