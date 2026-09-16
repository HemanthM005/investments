'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserPlus, Loader2 } from 'lucide-react';

const FIELD =
  'w-full rounded-lg border border-[#2a2d3e] bg-[#0f1117] px-3 py-2.5 text-sm text-slate-100 outline-none transition-colors placeholder:text-slate-600 focus:border-indigo-500';

export default function RegisterPage() {
  const [config, setConfig] = useState<{ enabled: boolean; minLength: number } | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/register').then((r) => r.json()).then(setConfig).catch(() => setConfig({ enabled: false, minLength: 6 }));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, code }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? 'Could not create the account');
        return;
      }
      window.location.href = '/'; // registration signs you in
    } catch {
      setError('Could not reach the server');
    } finally {
      setBusy(false);
    }
  }

  if (config && !config.enabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1117] px-4">
        <div className="max-w-xs space-y-3 text-center">
          <h1 className="text-lg font-bold text-slate-100">Registration is closed</h1>
          <p className="text-sm text-slate-500">
            New accounts are created by invite. Ask the owner for an invite code.
          </p>
          <Link href="/login" className="inline-block text-sm text-indigo-400 hover:text-indigo-300">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1117] px-4">
      <form onSubmit={submit} className="w-full max-w-xs space-y-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
            <UserPlus className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">Create an account</h1>
            <p className="mt-0.5 text-xs text-slate-500">Your data stays separate from everyone else&apos;s</p>
          </div>
        </div>

        <div className="space-y-2">
          <input className={FIELD} placeholder="Username" value={username} autoFocus
            autoCapitalize="none" autoCorrect="off" autoComplete="username"
            onChange={(e) => setUsername(e.target.value)} />
          <input className={FIELD} type="password" placeholder={`Password (min ${config?.minLength ?? 6})`}
            value={password} autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)} />
          <input className={FIELD} type="password" placeholder="Confirm password" value={confirm}
            autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)} />
          <input className={FIELD} placeholder="Invite code" value={code}
            onChange={(e) => setCode(e.target.value)} />
        </div>

        {error && <p className="text-center text-xs text-red-400">{error}</p>}

        <button type="submit" disabled={busy || !username || !password || !confirm || !code}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? 'Creating…' : 'Create account'}
        </button>

        <p className="text-center text-xs text-slate-500">
          Already have one?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
