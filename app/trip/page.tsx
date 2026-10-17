'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import RouteMap from '@/components/RouteMap';
import Itinerary from '@/components/Itinerary';
import AiPanel from '@/components/AiPanel';
import Bookings from '@/components/Bookings';
import Budget from '@/components/Budget';
import DayRail from '@/components/DayRail';
import { getTrip, listDays, listStops, fmtMoney } from '@/lib/db';
import type { Trip, Day, Stop } from '@/lib/types';

type Tab = 'plan' | 'ai' | 'bookings' | 'budget';
const TABS: [Tab, string][] = [
  ['plan', 'Plan & map'],
  ['ai', 'AI suggest'],
  ['bookings', 'Bookings'],
  ['budget', 'Budget'],
];

export default function TripPage() {
  return (
    <RequireAuth>
      {() => (
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <TripInner />
        </Suspense>
      )}
    </RequireAuth>
  );
}

function TripInner() {
  const params = useSearchParams();
  const id = params.get('id');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<Tab>('plan');
  const [dayId, setDayId] = useState<string | null>(null);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number; name: string; address?: string; place_id?: string } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [t, d, s] = await Promise.all([getTrip(id), listDays(id), listStops(id)]);
      setTrip(t);
      setDays(d);
      setStops(s);
      setDayId((cur) => cur ?? d[0]?.id ?? null);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const h = window.location.hash.replace('#', '') as Tab;
    if (['plan', 'ai', 'bookings', 'budget'].includes(h)) setTab(h);
  }, []);

  if (!id)
    return (
      <div className="alert-error">
        No trip id. <Link href="/trips/">Back to trips</Link>
      </div>
    );
  if (err) return <div className="alert-error">{err}</div>;
  if (!trip)
    return (
      <p className="text-muted">
        <span className="spinner" /> Loading trip…
      </p>
    );

  const day = days.find((d) => d.id === dayId) ?? null;
  const dayStops = stops.filter((s) => s.day_id === day?.id).sort((a, b) => a.sort - b.sort);
  const pinned = stops.filter((s) => s.lat != null).length;

  return (
    <>
      {/* trip header */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="min-w-0">
          <Link href="/trips/" className="text-xs text-muted hover:text-ink">
            ← My trips
          </Link>
          <h1 className="font-display text-3xl font-bold">{trip.title}</h1>
          <p className="text-xs text-muted">
            {trip.destination} · {trip.start_date} → {trip.end_date} · {days.length} days · {stops.length} stops ({pinned} pinned) · {trip.travellers} pax
            {trip.budget_total ? ` · ${fmtMoney(trip.budget_total, trip.currency)} budget` : ''}
          </p>
        </div>
        <span className="flex-1" />
        <nav className="tabs" aria-label="Trip sections">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              className={`tab ${tab === k ? 'tab-active' : ''}`}
              onClick={() => {
                setTab(k);
                history.replaceState(null, '', `#${k}`);
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'plan' && (
        <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1.05fr)_minmax(360px,.95fr)]">
          <DayRail days={days} stops={stops} selectedDayId={dayId} onSelectDay={setDayId} />
          <div className="flex flex-col gap-3 xl:sticky xl:top-[70px] xl:self-start">
            <RouteMap day={day} stops={dayStops} allStops={stops} onPickLocation={(loc) => setPendingPin(loc)} onDayChange={load} />
          </div>
          <Itinerary trip={trip} days={days} stops={stops} selectedDayId={dayId} onSelectDay={setDayId} onChange={load} pendingPin={pendingPin} clearPendingPin={() => setPendingPin(null)} />
        </div>
      )}
      {tab === 'ai' && <AiPanel trip={trip} days={days} stops={stops} selectedDayId={dayId} onChange={load} />}
      {tab === 'bookings' && <Bookings trip={trip} days={days} stops={stops} onChange={load} />}
      {tab === 'budget' && <Budget trip={trip} days={days} stops={stops} onChange={load} />}
    </>
  );
}
