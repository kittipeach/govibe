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
import { getTrip, listDays, listStops } from '@/lib/db';
import type { Trip, Day, Stop } from '@/lib/types';

type Tab = 'plan' | 'ai' | 'bookings' | 'budget';

export default function TripPage() {
  return (
    <RequireAuth>
      {() => (
        <Suspense fallback={<p className="muted">Loading…</p>}>
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

  if (!id) return <div className="alert error">No trip id. <Link href="/trips/">Back to trips</Link></div>;
  if (err) return <div className="alert error">{err}</div>;
  if (!trip) return <p className="muted"><span className="spinner" /> Loading trip…</p>;

  const day = days.find((d) => d.id === dayId) ?? null;
  const dayStops = stops.filter((s) => s.day_id === day?.id).sort((a, b) => a.sort - b.sort);
  const pinned = stops.filter((s) => s.lat != null).length;

  return (
    <>
      <div className="row" style={{ marginBottom: '.8rem' }}>
        <div>
          <Link href="/trips/" className="muted small">
            ← My trips
          </Link>
          <h1 style={{ margin: 0 }}>{trip.title}</h1>
          <p className="muted small" style={{ margin: 0 }}>
            📍 {trip.destination} · {trip.start_date} → {trip.end_date} · {days.length} days · {stops.length} stops ({pinned} pinned) · {trip.travellers} pax
          </p>
        </div>
      </div>

      <div className="tabs">
        {(
          [
            ['plan', '🗺️ Plan & map'],
            ['ai', '✨ AI suggest'],
            ['bookings', '🎫 Bookings'],
            ['budget', '💴 Budget'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'plan' && (
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, .9fr)' }}>
          <div className="stack" style={{ position: 'sticky', top: 70, alignSelf: 'start' }}>
            <div className="row">
              <strong>Map:</strong>
              <select className="input" style={{ width: 'auto' }} value={dayId ?? ''} onChange={(e) => setDayId(e.target.value)}>
                {days.map((d, i) => (
                  <option key={d.id} value={d.id}>
                    Day {i + 1} · {d.title} · {d.date}
                  </option>
                ))}
              </select>
              <span className="muted small">{dayStops.filter((s) => s.lat != null).length} pinned stops · press ▶ to play the route</span>
            </div>
            <RouteMap day={day} stops={dayStops} allStops={stops} onPickLocation={(loc) => setPendingPin(loc)} />
          </div>
          <Itinerary trip={trip} days={days} stops={stops} selectedDayId={dayId} onSelectDay={setDayId} onChange={load} pendingPin={pendingPin} clearPendingPin={() => setPendingPin(null)} />
        </div>
      )}
      {tab === 'ai' && <AiPanel trip={trip} days={days} stops={stops} selectedDayId={dayId} onChange={load} />}
      {tab === 'bookings' && <Bookings trip={trip} days={days} stops={stops} onChange={load} />}
      {tab === 'budget' && <Budget trip={trip} days={days} stops={stops} onChange={load} />}

      <style jsx global>{`
        @media (max-width: 900px) {
          main.container > .grid[style] {
            grid-template-columns: 1fr !important;
          }
          main.container > .grid[style] > .stack[style] {
            position: static !important;
          }
        }
      `}</style>
    </>
  );
}
