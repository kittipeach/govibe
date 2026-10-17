'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function RequireAuth({ children }: { children: (user: User) => React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    if (!isSupabaseConfigured()) { setUser(null); return; }
    const sb = supabase();
    sb.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (!data.user) router.replace('/login/');
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      setUser(s?.user ?? null);
      if (!s?.user) router.replace('/login/');
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (user === undefined) return <p className="text-muted"><span className="spinner" /> Loading…</p>;
  if (!user) return <div className="alert">Please <a href="login/" className="font-bold text-forest">log in</a> first.</div>;
  return <>{children(user)}</>;
}
