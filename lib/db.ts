'use client';
import { supabase } from './supabase';
import type { Trip, Day, Stop, Booking, Expense, TravelMode } from './types';

const sb = () => supabase();

/* ---------- Trips ---------- */
export async function listTrips(): Promise<Trip[]> {
  const { data, error } = await sb().from('trips').select('*').order('start_date', { ascending: false });
  if (error) throw error;
  return data as Trip[];
}

export async function getTrip(id: string): Promise<Trip> {
  const { data, error } = await sb().from('trips').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Trip;
}

export async function createTrip(input: Partial<Trip>): Promise<Trip> {
  const { data: u } = await sb().auth.getUser();
  if (!u.user) throw new Error('Not signed in');
  const { data, error } = await sb()
    .from('trips')
    .insert({ ...input, user_id: u.user.id })
    .select()
    .single();
  if (error) throw error;
  const trip = data as Trip;
  // Auto-create one day row per date in range
  const days = enumerateDates(trip.start_date, trip.end_date).map((date, i) => ({
    trip_id: trip.id,
    date,
    title: `Day ${i + 1}`,
    travel_mode: 'DRIVING' as TravelMode,
    sort: i,
  }));
  if (days.length) {
    const { error: e2 } = await sb().from('days').insert(days);
    if (e2) throw e2;
  }
  return trip;
}

export async function updateTrip(id: string, patch: Partial<Trip>) {
  const { error } = await sb().from('trips').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteTrip(id: string) {
  const { error } = await sb().from('trips').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- Days ---------- */
export async function listDays(tripId: string): Promise<Day[]> {
  const { data, error } = await sb().from('days').select('*').eq('trip_id', tripId).order('sort');
  if (error) throw error;
  return data as Day[];
}

export async function updateDay(id: string, patch: Partial<Day>) {
  const { error } = await sb().from('days').update(patch).eq('id', id);
  if (error) throw error;
}

/* ---------- Stops ---------- */
export async function listStops(tripId: string): Promise<Stop[]> {
  const { data, error } = await sb().from('stops').select('*').eq('trip_id', tripId).order('sort');
  if (error) throw error;
  return data as Stop[];
}

export async function addStop(input: Partial<Stop> & { trip_id: string }): Promise<Stop> {
  const { data, error } = await sb().from('stops').insert(input).select().single();
  if (error) throw error;
  return data as Stop;
}

export async function addStops(inputs: (Partial<Stop> & { trip_id: string })[]): Promise<Stop[]> {
  if (!inputs.length) return [];
  const { data, error } = await sb().from('stops').insert(inputs).select();
  if (error) throw error;
  return data as Stop[];
}

export async function updateStop(id: string, patch: Partial<Stop>) {
  const { error } = await sb().from('stops').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteStop(id: string) {
  const { error } = await sb().from('stops').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderStops(stops: Stop[]) {
  await Promise.all(stops.map((s, i) => (s.sort === i ? null : updateStop(s.id, { sort: i }))));
}

/* ---------- Bookings ---------- */
export async function listBookings(tripId: string): Promise<Booking[]> {
  const { data, error } = await sb().from('bookings').select('*').eq('trip_id', tripId).order('start_at');
  if (error) throw error;
  return data as Booking[];
}

export async function uploadBookingFile(tripId: string, file: File): Promise<string> {
  const { data: u } = await sb().auth.getUser();
  if (!u.user) throw new Error('Not signed in');
  const path = `${u.user.id}/${tripId}/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, '_')}`;
  const { error } = await sb().storage.from('bookings').upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function signedBookingUrl(path: string): Promise<string> {
  const { data, error } = await sb().storage.from('bookings').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function addBooking(input: Partial<Booking> & { trip_id: string }): Promise<Booking> {
  const { data, error } = await sb().from('bookings').insert(input).select().single();
  if (error) throw error;
  return data as Booking;
}

export async function deleteBooking(id: string) {
  const { error } = await sb().from('bookings').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- Expenses ---------- */
export async function listExpenses(tripId: string): Promise<Expense[]> {
  const { data, error } = await sb().from('expenses').select('*').eq('trip_id', tripId).order('created_at');
  if (error) throw error;
  return data as Expense[];
}

export async function addExpense(input: Partial<Expense> & { trip_id: string }): Promise<Expense> {
  const { data, error } = await sb().from('expenses').insert(input).select().single();
  if (error) throw error;
  return data as Expense;
}

export async function deleteExpense(id: string) {
  const { error } = await sb().from('expenses').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- helpers ---------- */
export function enumerateDates(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function fmtMoney(n: number | null | undefined, cur = 'JPY') {
  if (n == null) return '—';
  return new Intl.NumberFormat('en', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n);
}
