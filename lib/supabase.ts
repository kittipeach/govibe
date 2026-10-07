'use client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** Browser-side Supabase client (anon key only — RLS protects every table). */
export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_ANON_KEY || 'anon', {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

/** Call a Supabase Edge Function with the user's JWT. */
export async function callFunction<T = unknown>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase().functions.invoke(name, { body });
  if (error) throw new Error(error.message ?? String(error));
  return data as T;
}
