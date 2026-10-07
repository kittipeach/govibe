'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'error' | 'ok'; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!isSupabaseConfigured()) {
      setMsg({ kind: 'error', text: 'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.' });
      return;
    }
    setBusy(true);
    try {
      const sb = supabase();
      if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) {
          router.push('/trips/');
        } else {
          setMsg({ kind: 'ok', text: 'Check your email to confirm your account, then log in.' });
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/trips/');
      }
    } catch (err) {
      setMsg({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: '3rem auto' }}>
      <h2>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h2>
      <p className="muted small">
        {mode === 'signup' ? 'Email + password. No social login needed.' : 'Log in to open your trips.'}
      </p>
      <form onSubmit={submit} className="stack">
        <div className="field">
          <label>Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div className="field">
          <label>Password</label>
          <input
            className="input"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </div>
        {msg && <div className={`alert ${msg.kind}`}>{msg.text}</div>}
        <button className="btn primary" disabled={busy} type="submit">
          {busy ? <span className="spinner" /> : mode === 'signup' ? 'Sign up' : 'Log in'}
        </button>
      </form>
      <p className="muted small" style={{ marginTop: '1rem', marginBottom: 0 }}>
        {mode === 'signup' ? (
          <>
            Already have an account? <Link href="/login/">Log in</Link>
          </>
        ) : (
          <>
            New here? <Link href="/signup/">Create an account</Link>
          </>
        )}
      </p>
    </div>
  );
}
