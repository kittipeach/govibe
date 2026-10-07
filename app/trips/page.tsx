'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import { listTrips, createTrip, deleteTrip, fmtMoney } from '@/lib/db';
import type { Trip } from '@/lib/types';

export default function TripsPage() {
  return <RequireAuth>{() => <TripsInner />}</RequireAuth>;
}

function TripsInner() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [err, setErr] = useState('');

  const load = () => listTrips().then(setTrips).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="row" style={{ marginBottom: '1rem' }}>
        <h1>My trips</h1>
        <span className="spacer" />
        <button className="btn primary" onClick={() => setShowNew((v) => !v)}>
          + New trip
        </button>
      </div>
      {err && <div className="alert error">{err}</div>}
      {showNew && (
        <NewTripForm
          onDone={() => {
            setShowNew(false);
            load();
          }}
        />
      )}
      {trips === null ? (
        <p className="muted">
          <span className="spinner" /> Loading…
        </p>
      ) : trips.length === 0 ? (
        <div className="card">
          <h3>No trips yet</h3>
          <p className="muted small">Create your first trip — e.g. “Japan winter: Fuji run + Hakuba ski”.</p>
        </div>
      ) : (
        <div className="grid grid-3">
          {trips.map((t) => (
            <div className="card" key={t.id}>
              <div className="row">
                <h3 style={{ margin: 0 }}>
                  <Link href={`/trip/?id=${t.id}`}>{t.title}</Link>
                </h3>
                <span className="spacer" />
                <button
                  className="icon-btn"
                  title="Delete trip"
                  onClick={async () => {
                    if (confirm(`Delete “${t.title}”? This removes all days, stops, bookings and expenses.`)) {
                      await deleteTrip(t.id);
                      load();
                    }
                  }}
                >
                  🗑
                </button>
              </div>
              <p className="muted small" style={{ margin: '.3rem 0' }}>
                📍 {t.destination} · {t.start_date} → {t.end_date} · {t.travellers} pax
              </p>
              <p className="small" style={{ margin: 0 }}>
                Budget: {t.budget_total ? fmtMoney(t.budget_total, t.currency) : '—'}
              </p>
              <Link href={`/trip/?id=${t.id}`} className="btn sm" style={{ marginTop: '.7rem' }}>
                Open →
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function NewTripForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({
    title: '',
    destination: '',
    start_date: '',
    end_date: '',
    currency: 'JPY',
    home_currency: 'THB',
    fx_rate: 0.23,
    budget_total: '',
    travellers: 2,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: unknown) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.end_date < f.start_date) {
      setErr('End date must be after start date');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await createTrip({
        ...f,
        fx_rate: Number(f.fx_rate),
        travellers: Number(f.travellers),
        budget_total: f.budget_total ? Number(f.budget_total) : null,
      });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card stack" onSubmit={submit} style={{ marginBottom: '1.2rem' }}>
      <h3>New trip</h3>
      <div className="form-grid">
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Title</label>
          <input className="input" required value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Japan winter 2026" />
        </div>
        <div className="field">
          <label>Destination</label>
          <input className="input" required value={f.destination} onChange={(e) => set('destination', e.target.value)} placeholder="Tokyo · Fuji · Hakuba" />
        </div>
        <div className="field">
          <label>Travellers</label>
          <input className="input" type="number" min={1} value={f.travellers} onChange={(e) => set('travellers', e.target.value)} />
        </div>
        <div className="field">
          <label>Start</label>
          <input className="input" type="date" required value={f.start_date} onChange={(e) => set('start_date', e.target.value)} />
        </div>
        <div className="field">
          <label>End</label>
          <input className="input" type="date" required value={f.end_date} onChange={(e) => set('end_date', e.target.value)} />
        </div>
        <div className="field">
          <label>Trip currency</label>
          <input className="input" value={f.currency} onChange={(e) => set('currency', e.target.value.toUpperCase())} />
        </div>
        <div className="field">
          <label>Home currency</label>
          <input className="input" value={f.home_currency} onChange={(e) => set('home_currency', e.target.value.toUpperCase())} />
        </div>
        <div className="field">
          <label>
            FX (1 {f.currency} = ? {f.home_currency})
          </label>
          <input className="input" type="number" step="0.0001" value={f.fx_rate} onChange={(e) => set('fx_rate', e.target.value)} />
        </div>
        <div className="field">
          <label>Budget ({f.currency})</label>
          <input className="input" type="number" value={f.budget_total} onChange={(e) => set('budget_total', e.target.value)} placeholder="647000" />
        </div>
      </div>
      {err && <div className="alert error">{err}</div>}
      <div className="row">
        <button className="btn primary" disabled={busy}>
          {busy ? <span className="spinner" /> : 'Create trip'}
        </button>
      </div>
    </form>
  );
}
