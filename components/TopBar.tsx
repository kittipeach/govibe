'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 font-display font-bold text-ink ${size === 'lg' ? 'text-2xl' : 'text-xl'}`}>
      <span className="inline-block h-3.5 w-3.5 rounded-full border-[3px] border-clay bg-forest" aria-hidden="true" />
      GoVibe
    </Link>
  );
}

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
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-page items-center gap-4 px-5 py-3">
        <Logo />
        {user && (
          <Link href="/trips/" className="btn btn-sm">
            My trips
          </Link>
        )}
        <span className="flex-1" />
        {user ? (
          <>
            <span className="hidden text-xs text-muted sm:inline">{user.email}</span>
            <button className="btn btn-sm" onClick={() => supabase().auth.signOut()}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link href="/login/" className="px-2 text-sm font-semibold text-ink">
              Log in
            </Link>
            <Link href="/signup/" className="btn-primary btn-sm">
              Start a trip
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
