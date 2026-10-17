'use client';
import { useState } from 'react';
import type { Day, Stop, StopKind, Trip } from '@/lib/types';
import { KIND_ICON } from '@/lib/types';
import { addStop, updateStop, deleteStop, reorderStops, updateDay, fmtMoney } from '@/lib/db';
import { fmtDate } from '@/components/DayRail';
import { PinIcon, TrashIcon, PencilIcon, UpIcon, DownIcon } from '@/components/icons';

interface Props {
  trip: Trip;
  days: Day[];
  stops: Stop[];
  selectedDayId: string | null;
  onSelectDay: (id: string) => void;
  onChange: () => void;
  pendingPin: { lat: number; lng: number; name: string; address?: string; place_id?: string } | null;
  clearPendingPin: () => void;
}

/** Itinerary editor for the selected day. */
export default function Itinerary({ trip, days, stops, selectedDayId, onChange, pendingPin, clearPendingPin }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const day = days.find((d) => d.id === selectedDayId) ?? days[0];
  if (!day) return <div className="card text-sm text-muted">This trip has no days.</div>;
  const list = stops.filter((s) => s.day_id === day.id).sort((a, b) => a.sort - b.sort);
  const dayCost = list.reduce((a, s) => a + (s.cost ?? 0), 0);
  const di = days.findIndex((d) => d.id === day.id);

  async function move(stop: Stop, dir: -1 | 1) {
    const i = list.findIndex((s) => s.id === stop.id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await reorderStops(list);
    onChange();
  }

  async function addPending(targetDayId: string) {
    if (!pendingPin) return;
    const n = stops.filter((s) => s.day_id === targetDayId).length;
    await addStop({ trip_id: trip.id, day_id: targetDayId, name: pendingPin.name, kind: 'sight', lat: pendingPin.lat, lng: pendingPin.lng, address: pendingPin.address ?? null, place_id: pendingPin.place_id ?? null, sort: n, source: 'manual' });
    clearPendingPin();
    onChange();
  }

  return (
    <section className="card flex flex-col gap-3.5 p-5">
      <div className="flex flex-wrap items-baseline gap-2.5">
        <h2 className="font-display text-2xl font-bold">
          Day {di + 1} ·{' '}
          <input
            className="inline-block w-[12ch] max-w-full border-b border-transparent bg-transparent font-display text-2xl font-bold focus:border-forest focus:outline-none"
            defaultValue={day.title}
            key={day.id}
            aria-label="Day title"
            onBlur={async (e) => {
              if (e.target.value !== day.title) {
                await updateDay(day.id, { title: e.target.value });
                onChange();
              }
            }}
          />
        </h2>
        <span className="text-xs text-muted">{fmtDate(day.date)}</span>
        <span className="flex-1" />
        <button className="btn-outline btn-sm" onClick={() => setEditing(`new:${day.id}`)}>
          + Stop
        </button>
      </div>

      {pendingPin && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg2 border border-forest-line bg-forest-tint px-3 py-2.5 text-sm">
          <PinIcon size={18} className="text-forest" />
          <span className="min-w-0 flex-1 truncate">
            <strong>{pendingPin.name}</strong> <span className="text-xs text-muted">{pendingPin.address}</span>
          </span>
          <button className="btn-primary btn-sm" onClick={() => addPending(day.id)}>
            Add to Day {di + 1}
          </button>
          <select className="input w-auto py-1.5 text-xs" defaultValue="" aria-label="Add to another day" onChange={(e) => e.target.value && addPending(e.target.value)}>
            <option value="">other day…</option>
            {days.map((d, i) => (
              <option key={d.id} value={d.id}>
                Day {i + 1} · {d.date}
              </option>
            ))}
          </select>
          <button className="icon-btn" onClick={clearPendingPin} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {list.length === 0 && editing !== `new:${day.id}` && (
        <p className="rounded-lg2 border border-dashed border-line p-4 text-center text-sm text-muted">
          No stops yet — search on the map, ask AI, or add one by hand.
          <span className="th">ยังไม่มีจุด — ค้นหาบนแผนที่ ถาม AI หรือเพิ่มเอง</span>
        </p>
      )}

      <div className="flex flex-col gap-2">
        {list.map((s, i) =>
          editing === s.id ? (
            <StopForm
              key={s.id}
              initial={s}
              tripCurrency={trip.currency}
              onCancel={() => setEditing(null)}
              onSave={async (patch) => {
                await updateStop(s.id, patch);
                setEditing(null);
                onChange();
              }}
            />
          ) : (
            <div key={s.id} className="stop">
              <div className={`timebox ${s.kind === 'hotel' || s.kind === 'flight' ? 'bg-clay' : ''}`}>
                <span>{s.start_time ?? KIND_ICON[s.kind]}</span>
                <span className="mt-0.5 text-sm">{i + 1}</span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-[15px] font-bold">
                  <span className="truncate">{s.name}</span>
                  {s.source === 'ai' && <span className="badge-ai">AI</span>}
                  {s.source === 'booking' && <span className="badge-booking">BOOKING</span>}
                  {s.lat == null && <span className="badge-muted">no pin</span>}
                </div>
                <div className="text-xs text-muted">
                  {s.start_time && s.end_time && <>{s.start_time}–{s.end_time} · </>}
                  {s.cost != null && <>{fmtMoney(s.cost, trip.currency)} · </>}
                  {s.address ?? s.kind}
                </div>
                {s.note && <div className="mt-1 text-xs text-ink2">{s.note}</div>}
              </div>
              <div className="flex items-center">
                <button className="icon-btn" onClick={() => move(s, -1)} aria-label="Move up" disabled={i === 0}>
                  <UpIcon size={14} />
                </button>
                <button className="icon-btn" onClick={() => move(s, 1)} aria-label="Move down" disabled={i === list.length - 1}>
                  <DownIcon size={14} />
                </button>
                <button className="icon-btn" onClick={() => setEditing(s.id)} aria-label="Edit">
                  <PencilIcon size={14} />
                </button>
                <button
                  className="icon-btn"
                  aria-label="Delete"
                  onClick={async () => {
                    if (confirm(`Remove “${s.name}”?`)) {
                      await deleteStop(s.id);
                      onChange();
                    }
                  }}
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            </div>
          ),
        )}

        {editing === `new:${day.id}` && (
          <StopForm
            initial={null}
            tripCurrency={trip.currency}
            onCancel={() => setEditing(null)}
            onSave={async (patch) => {
              await addStop({ trip_id: trip.id, day_id: day.id, sort: list.length, source: 'manual', kind: 'sight', ...patch });
              setEditing(null);
              onChange();
            }}
          />
        )}
      </div>

      <div className="mt-auto flex justify-between border-t border-line pt-3 text-xs text-muted">
        <span>Day cost</span>
        <strong className="text-ink">
          {fmtMoney(dayCost, trip.currency)} · {fmtMoney(dayCost * trip.fx_rate, trip.home_currency)}
        </strong>
      </div>
    </section>
  );
}

function StopForm({ initial, tripCurrency, onSave, onCancel }: { initial: Stop | null; tripCurrency: string; onSave: (p: Partial<Stop>) => Promise<void>; onCancel: () => void }) {
  const [f, setF] = useState({
    name: initial?.name ?? '',
    kind: (initial?.kind ?? 'sight') as StopKind,
    start_time: initial?.start_time ?? '',
    end_time: initial?.end_time ?? '',
    cost: initial?.cost?.toString() ?? '',
    note: initial?.note ?? '',
    lat: initial?.lat?.toString() ?? '',
    lng: initial?.lng?.toString() ?? '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const F = ({ label, k, type = 'text', step, span }: { label: string; k: keyof typeof f; type?: string; step?: string; span?: boolean }) => (
    <div className={`field ${span ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
      <label className="label" htmlFor={`sf-${k}`}>
        {label}
      </label>
      <input id={`sf-${k}`} className="input" type={type} step={step} required={k === 'name'} value={f[k]} onChange={(e) => set(k, e.target.value)} />
    </div>
  );
  return (
    <form
      className="flex flex-col gap-3 rounded-lg2 border border-forest-line bg-paper p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSave({ name: f.name, kind: f.kind, start_time: f.start_time || null, end_time: f.end_time || null, cost: f.cost ? Number(f.cost) : null, note: f.note || null, lat: f.lat ? Number(f.lat) : null, lng: f.lng ? Number(f.lng) : null });
        setBusy(false);
      }}
    >
      <div className="form-grid">
        <F label="Name" k="name" span />
        <div className="field">
          <label className="label" htmlFor="sf-kind">
            Type
          </label>
          <select id="sf-kind" className="input" value={f.kind} onChange={(e) => set('kind', e.target.value)}>
            {Object.entries(KIND_ICON).map(([k, ic]) => (
              <option key={k} value={k}>
                {ic} {k}
              </option>
            ))}
          </select>
        </div>
        <F label="Start" k="start_time" type="time" />
        <F label="End" k="end_time" type="time" />
        <F label={`Cost (${tripCurrency})`} k="cost" type="number" />
        <F label="Lat" k="lat" type="number" step="any" />
        <F label="Lng" k="lng" type="number" step="any" />
        <div className="field sm:col-span-2 lg:col-span-3">
          <label className="label" htmlFor="sf-note">
            Note
          </label>
          <textarea id="sf-note" className="input min-h-[70px]" value={f.note} onChange={(e) => set('note', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn-primary btn-sm" disabled={busy}>
          Save
        </button>
        <button className="btn btn-sm" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
