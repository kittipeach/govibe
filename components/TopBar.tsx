'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function TopBar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const sb = supabase();
    sb.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand">
          <span className="dot" /> GoVibe
        </Link>
        {user && (
          <Link href="/trips/" className="btn sm">
            🧳 My trips
          </Link>
        )}
        <span className="spacer" />
        {user ? (
          <>
            <span className="muted small">{user.email}</span>
            <button className="btn sm" onClick={() => supabase().auth.signOut()}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/login/" className="btn sm">
              Log in
            </Link>
            <Link href="/signup/" className="btn sm primary">
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
