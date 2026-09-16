// Brute-force throttle for the login endpoint.
//
// A short PIN is only safe if guessing is slow, so failures are counted per
// client IP and the account locks out for a growing window.
//
// Caveat: this lives in module memory. Fluid Compute reuses instances, so it
// holds across requests in practice, but an attacker spread across many cold
// instances could still get more attempts than the numbers below suggest.
// It raises the cost of a 10,000-guess sweep by orders of magnitude; it is
// not a substitute for a long password or a shared store like Redis.

type Attempt = { fails: number; blockedUntil: number; lastSeen: number };

const attempts = new Map<string, Attempt>();

const MAX_FREE_ATTEMPTS = 5;      // before any lockout kicks in
const BASE_LOCKOUT_MS = 30_000;   // doubles per failure past the threshold
const MAX_LOCKOUT_MS = 60 * 60_000;
const FORGET_AFTER_MS = 60 * 60_000;

export function clientKey(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return fwd?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

/** Milliseconds the caller must wait, or 0 when a guess is allowed. */
export function retryAfterMs(key: string): number {
  const a = attempts.get(key);
  if (!a) return 0;
  const remaining = a.blockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  const a = attempts.get(key) ?? { fails: 0, blockedUntil: 0, lastSeen: now };
  a.fails += 1;
  a.lastSeen = now;
  if (a.fails > MAX_FREE_ATTEMPTS) {
    const factor = 2 ** (a.fails - MAX_FREE_ATTEMPTS - 1);
    a.blockedUntil = now + Math.min(BASE_LOCKOUT_MS * factor, MAX_LOCKOUT_MS);
  }
  attempts.set(key, a);

  // Opportunistic cleanup so the map can't grow without bound. Keyed on
  // lastSeen — using blockedUntil would drop entries that have not been
  // blocked yet (blockedUntil 0), so the counter could never accumulate.
  for (const [k, v] of attempts) {
    if (now - v.lastSeen > FORGET_AFTER_MS) attempts.delete(k);
  }
}

export function recordSuccess(key: string): void {
  attempts.delete(key);
}
