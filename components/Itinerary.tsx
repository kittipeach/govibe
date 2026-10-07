'use client';
import { useState } from 'react';
import type { Day, Stop, StopKind, TravelMode, Trip } from '@/lib/types';
import { KIND_ICON } from '@/lib/types';
import { addStop, updateStop, deleteStop, reorderStops, updateDay, fmtMoney } from '@/lib/db';

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

export default function Itinerary({ trip, days, stops, selectedDayId, onSelectDay, onChange, pendingPin, clearPendingPin }: Props) {
  const [editing, setEditing] = useState<string | null>(null);

  async function move(day: Day, stop: Stop, dir: -1 | 1) {
    const list = stops.filter((s) => s.day_id === day.id).sort((a, b) => a.sort - b.sort);
    const i = list.findIndex((s) => s.id === stop.id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    await reorderStops(list);
    onChange();
  }

  async function addPendingTo(day: Day) {
    if (!pendingPin) return;
    const n = stops.filter((s) => s.day_id === day.id).length;
    await addStop({
      trip_id: trip.id,
      day_id: day.id,
      name: pendingPin.name,
      kind: 'sight',
      lat: pendingPin.lat,
      lng: pendingPin.lng,
      address: pendingPin.address ?? null,
      place_id: pendingPin.place_id ?? null,
      sort: n,
      source: 'manual',
    });
    clearPendingPin();
    onChange();
  }

  return (
    <div>
      {pendingPin && (
        <div className="alert ok row" style={{ marginBottom: '1rem' }}>
          <span>
            📍 <strong>{pendingPin.name}</strong> <span className="muted small">{pendingPin.address}</span>
          </span>
          <span className="spacer" />
          <select
            className="input"
            style={{ width: 'auto' }}
            defaultValue=""
            onChange={(e) => {
              const d = days.find((x) => x.id === e.target.value);
              if (d) addPendingTo(d);
            }}
          >
            <option value="" disabled>
              Add to day…
            </option>
            {days.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} · {d.date}
              </option>
            ))}
          </select>
          <button className="btn sm" onClick={clearPendingPin}>
            ✕
          </button>
        </div>
      )}

      {days.map((day, di) => {
        const list = stops.filter((s) => s.day_id === day.id).sort((a, b) => a.sort - b.sort);
        const dayCost = list.reduce((a, s) => a + (s.cost ?? 0), 0);
        const active = day.id === selectedDayId;
        return (
          <section key={day.id} className="day card" style={active ? { borderColor: 'var(--accent)' } : undefined}>
            <div className="day-head">
              <h3>
                <button className="icon-btn" style={{ fontSize: '1rem', fontWeight: 800, color: active ? 'var(--accent)' : 'inherit' }} onClick={() => onSelectDay(day.id)} title="Show this day on the map">
                  {active ? '🗺️ ' : ''}Day {di + 1}
                </button>{' '}
                <input
                  className="input"
                  style={{ display: 'inline-block', width: 'auto', padding: '.2rem .5rem', fontWeight: 600 }}
                  defaultValue={day.title}
                  onBlur={async (e) => {
                    if (e.target.value !== day.title) {
                      await updateDay(day.id, { title: e.target.value });
                      onChange();
                    }
                  }}
                />
              </h3>
              <span className="muted small">{fmtDate(day.date)}</span>
              <select
                className="input"
                style={{ width: 'auto', padding: '.2rem .4rem' }}
                value={day.travel_mode}
                onChange={async (e) => {
                  await updateDay(day.id, { travel_mode: e.target.value as TravelMode });
                  onChange();
                }}
                title="Travel mode for route playback"
              >
                <option value="DRIVING">🚗 Drive</option>
                <option value="WALKING">🚶 Walk</option>
                <option value="TRANSIT">🚆 Transit</option>
                <option value="BICYCLING">🚲 Bike</option>
              </select>
              <span className="spacer" />
              <span className="small muted">{dayCost ? fmtMoney(dayCost, trip.currency) : ''}</span>
              <button className="btn sm" onClick={() => setEditing(`new:${day.id}`)}>
                + Stop
              </button>
            </div>

            {list.length === 0 && editing !== `new:${day.id}` && <p className="muted small">No stops yet — search on the map, ask AI, or add manually.</p>}

            {list.map((s, i) => (
              <div key={s.id}>
                {editing === s.id ? (
                  <StopForm
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
                  <div className="stop">
                    <div className="icon">{KIND_ICON[s.kind]}</div>
                    <div>
                      <div className="name">
                        {i + 1}. {s.name}{' '}
                        {s.source === 'ai' && <span className="badge ai">AI</span>}
                        {s.source === 'booking' && <span className="badge booking">booking</span>}
                        {s.lat == null && <span className="badge">no pin</span>}
                      </div>
                      <div className="meta">
                        {s.start_time && <>🕒 {s.start_time}{s.end_time ? `–${s.end_time}` : ''} · </>}
                        {s.cost != null && <>{fmtMoney(s.cost, trip.currency)} · </>}
                        {s.address && <span>{s.address}</span>}
                      </div>
                      {s.note && <div className="small" style={{ marginTop: '.2rem' }}>{s.note}</div>}
                    </div>
                    <div className="row" style={{ gap: '.1rem' }}>
                      <button className="icon-btn" onClick={() => move(day, s, -1)} title="Move up">▲</button>
                      <button className="icon-btn" onClick={() => move(day, s, 1)} title="Move down">▼</button>
                      <button className="icon-btn" onClick={() => setEditing(s.id)} title="Edit">✎</button>
                      <button
                        className="icon-btn"
                        onClick={async () => {
                          if (confirm(`Remove “${s.name}”?`)) {
                            await deleteStop(s.id);
                            onChange();
                          }
                        }}
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

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
          </section>
        );
      })}
    </div>
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
  return (
    <form
      className="card stack"
      style={{ marginBottom: '.5rem' }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSave({
          name: f.name,
          kind: f.kind,
          start_time: f.start_time || null,
          end_time: f.end_time || null,
          cost: f.cost ? Number(f.cost) : null,
          note: f.note || null,
          lat: f.lat ? Number(f.lat) : null,
          lng: f.lng ? Number(f.lng) : null,
        });
        setBusy(false);
      }}
    >
      <div className="form-grid">
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Name</label>
          <input className="input" required value={f.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="field">
          <label>Type</label>
          <select className="input" value={f.kind} onChange={(e) => set('kind', e.target.value)}>
            {Object.entries(KIND_ICON).map(([k, ic]) => (
              <option key={k} value={k}>
                {ic} {k}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Start</label>
          <input className="input" type="time" value={f.start_time} onChange={(e) => set('start_time', e.target.value)} />
        </div>
        <div className="field">
          <label>End</label>
          <input className="input" type="time" value={f.end_time} onChange={(e) => set('end_time', e.target.value)} />
        </div>
        <div className="field">
          <label>Cost ({tripCurrency})</label>
          <input className="input" type="number" value={f.cost} onChange={(e) => set('cost', e.target.value)} />
        </div>
        <div className="field">
          <label>Lat</label>
          <input className="input" type="number" step="any" value={f.lat} onChange={(e) => set('lat', e.target.value)} />
        </div>
        <div className="field">
          <label>Lng</label>
          <input className="input" type="number" step="any" value={f.lng} onChange={(e) => set('lng', e.target.value)} />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <label>Note</label>
          <textarea className="input" value={f.note} onChange={(e) => set('note', e.target.value)} />
        </div>
      </div>
      <div className="row">
        <button className="btn primary sm" disabled={busy}>
          Save
        </button>
        <button className="btn sm" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
