'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import RequireAuth from '@/components/RequireAuth';
import { listTrips, createTrip, deleteTrip, fmtMoney } from '@/lib/db';
import type { Trip } from '@/lib/types';
import { TrashIcon } from '@/components/icons';

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
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div>
          <h1 className="font-display text-4xl font-medium">My trips</h1>
          <p className="text-sm text-muted">Each trip keeps its own days, stops, bookings and budget.</p>
        </div>
        <span className="flex-1" />
        <button className="btn-primary" onClick={() => setShowNew((v) => !v)}>
          + New trip
        </button>
      </div>
      {err && <div className="alert-error mb-4">{err}</div>}
      {showNew && (
        <NewTripForm
          onDone={() => {
            setShowNew(false);
            load();
          }}
        />
      )}
      {trips === null ? (
        <p className="text-muted">
          <span className="spinner" /> Loading…
        </p>
      ) : trips.length === 0 ? (
        <div className="card">
          <h3 className="font-display text-xl font-bold">No trips yet</h3>
          <p className="text-sm text-muted">Create your first trip — e.g. “Japan winter: Fuji run + Hakuba ski”.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((t) => (
            <div className="card flex flex-col gap-2" key={t.id}>
              <div className="flex items-start gap-2">
                <h3 className="font-display text-xl font-bold">
                  <Link href={`/trip/?id=${t.id}`}>{t.title}</Link>
                </h3>
                <span className="flex-1" />
                <button
                  className="icon-btn"
                  title="Delete trip"
                  aria-label="Delete trip"
                  onClick={async () => {
                    if (confirm(`Delete “${t.title}”? This removes all days, stops, bookings and expenses.`)) {
                      await deleteTrip(t.id);
                      load();
                    }
                  }}
                >
                  <TrashIcon />
                </button>
              </div>
              <p className="text-xs text-muted">
                {t.destination} · {t.start_date} → {t.end_date} · {t.travellers} pax
              </p>
              <p className="text-sm">Budget: {t.budget_total ? fmtMoney(t.budget_total, t.currency) : '—'}</p>
              <Link href={`/trip/?id=${t.id}`} className="btn btn-sm mt-2 self-start">
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
  const [f, setF] = useState({ title: '', destination: '', start_date: '', end_date: '', currency: 'JPY', home_currency: 'THB', fx_rate: 0.23, budget_total: '', travellers: 2 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: string, v: unknown) => setF((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.end_date < f.start_date) return setErr('End date must be after start date');
    setBusy(true);
    setErr('');
    try {
      await createTrip({ ...f, fx_rate: Number(f.fx_rate), travellers: Number(f.travellers), budget_total: f.budget_total ? Number(f.budget_total) : null });
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const Field = ({ label, k, type = 'text', placeholder, span, step, min }: { label: string; k: keyof typeof f; type?: string; placeholder?: string; span?: boolean; step?: string; min?: number }) => (
    <div className={`field ${span ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
      <label className="label" htmlFor={`nt-${k}`}>
        {label}
      </label>
      <input id={`nt-${k}`} className="input" type={type} required={['title', 'destination', 'start_date', 'end_date'].includes(k)} value={f[k] as string} placeholder={placeholder} step={step} min={min} onChange={(e) => set(k, k === 'currency' || k === 'home_currency' ? e.target.value.toUpperCase() : e.target.value)} />
    </div>
  );

  return (
    <form className="card mb-5 flex flex-col gap-4" onSubmit={submit}>
      <h3 className="font-display text-xl font-bold">New trip</h3>
      <div className="form-grid">
        <Field label="Title" k="title" placeholder="Japan winter 2026" span />
        <Field label="Destination" k="destination" placeholder="Tokyo · Fuji · Hakuba" />
        <Field label="Travellers" k="travellers" type="number" min={1} />
        <Field label="Start" k="start_date" type="date" />
        <Field label="End" k="end_date" type="date" />
        <Field label="Trip currency" k="currency" />
        <Field label="Home currency" k="home_currency" />
        <Field label={`FX (1 ${f.currency} = ? ${f.home_currency})`} k="fx_rate" type="number" step="0.0001" />
        <Field label={`Budget (${f.currency})`} k="budget_total" type="number" placeholder="647000" />
      </div>
      {err && <div className="alert-error">{err}</div>}
      <div>
        <button className="btn-primary" disabled={busy}>
          {busy ? <span className="spinner" /> : 'Create trip'}
        </button>
      </div>
    </form>
  );
}
