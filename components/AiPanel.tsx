'use client';
import { useState } from 'react';
import { callFunction } from '@/lib/supabase';
import { addStops } from '@/lib/db';
import type { AiSuggestion, Day, Stop, Trip } from '@/lib/types';
import { KIND_ICON } from '@/lib/types';

interface Props {
  trip: Trip;
  days: Day[];
  stops: Stop[];
  selectedDayId: string | null;
  onChange: () => void;
}

/**
 * Asks the `ai-recommend` Edge Function for places near the selected day's stops.
 * The Anthropic key lives only in Supabase secrets — the browser never sees it.
 */
export default function AiPanel({ trip, days, stops, selectedDayId, onChange }: Props) {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [results, setResults] = useState<AiSuggestion[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const day = days.find((d) => d.id === selectedDayId) ?? days[0];

  async function ask(quick?: string) {
    const q = quick ?? prompt;
    if (!q.trim()) return;
    setBusy(true);
    setErr('');
    setResults([]);
    setPicked(new Set());
    try {
      const dayStops = stops.filter((s) => s.day_id === day?.id);
      const res = await callFunction<{ suggestions: AiSuggestion[] }>('ai-recommend', {
        query: q,
        trip: { title: trip.title, destination: trip.destination, start_date: trip.start_date, end_date: trip.end_date, travellers: trip.travellers, currency: trip.currency },
        day: day ? { date: day.date, title: day.title, travel_mode: day.travel_mode } : null,
        stops: dayStops.map((s) => ({ name: s.name, kind: s.kind, lat: s.lat, lng: s.lng, start_time: s.start_time })),
        all_stops: stops.map((s) => s.name),
      });
      setResults(res.suggestions ?? []);
    } catch (e) {
      setErr((e as Error).message + ' — is the ai-recommend Edge Function deployed with ANTHROPIC_API_KEY set?');
    } finally {
      setBusy(false);
    }
  }

  async function addPicked() {
    if (!day) return;
    const base = stops.filter((s) => s.day_id === day.id).length;
    const rows = [...picked].map((i, n) => {
      const r = results[i];
      return { trip_id: trip.id, day_id: day.id, name: r.name, kind: r.kind, lat: r.lat, lng: r.lng, note: r.reason, cost: r.est_cost ?? null, start_time: r.best_time ?? null, sort: base + n, source: 'ai' as const };
    });
    await addStops(rows);
    setResults((rs) => rs.filter((_, i) => !picked.has(i)));
    setPicked(new Set());
    onChange();
  }

  const quick = ['Best local food near today\'s stops', 'Scenic viewpoints & photo spots', 'Onsen / relaxing after a long day', 'Shopping & souvenirs', 'Kid-friendly / easy walk', 'Hidden gems locals love'];

  return (
    <div className="stack">
      <div className="card">
        <h3>
          ✨ AI recommendations
          <span className="th">ให้ AI แนะนำจุดเที่ยว/ร้านอาหารใกล้แผนของวันนี้ แล้วติ๊กเลือกเพิ่มเข้าแผนได้เลย</span>
        </h3>
        <p className="muted small">
          Context: <strong>{day ? `${day.title} · ${day.date}` : 'no day selected'}</strong> · {stops.filter((s) => s.day_id === day?.id).length} stops already planned
        </p>
        <div className="row">
          {quick.map((q) => (
            <button key={q} className="btn sm" onClick={() => ask(q)} disabled={busy}>
              {q}
            </button>
          ))}
        </div>
        <form
          className="row"
          style={{ marginTop: '.7rem' }}
          onSubmit={(e) => {
            e.preventDefault();
            ask();
          }}
        >
          <input className="input" style={{ flex: 1 }} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. ramen within 10 min walk of Kawaguchiko station, under ¥1500" />
          <button className="btn primary" disabled={busy || !prompt.trim()}>
            {busy ? <span className="spinner" /> : 'Ask'}
          </button>
        </form>
        {err && <div className="alert error" style={{ marginTop: '.7rem' }}>{err}</div>}
      </div>

      {results.length > 0 && (
        <div className="card">
          <div className="row" style={{ marginBottom: '.6rem' }}>
            <h3 style={{ margin: 0 }}>{results.length} suggestions</h3>
            <span className="spacer" />
            <button className="btn primary sm" disabled={picked.size === 0} onClick={addPicked}>
              Add {picked.size || ''} to {day?.title}
            </button>
          </div>
          {results.map((r, i) => (
            <label key={i} className="stop" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={picked.has(i)}
                onChange={(e) => {
                  const s = new Set(picked);
                  e.target.checked ? s.add(i) : s.delete(i);
                  setPicked(s);
                }}
              />
              <div>
                <div className="name">
                  {KIND_ICON[r.kind] ?? '📍'} {r.name}
                </div>
                <div className="meta">
                  {r.best_time && <>🕒 {r.best_time} · </>}
                  {r.est_cost != null && <>~{r.est_cost} {trip.currency} · </>}
                  {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                </div>
                <div className="small" style={{ marginTop: '.2rem' }}>
                  {r.reason}
                  {r.reason_th && <span className="th">{r.reason_th}</span>}
                </div>
              </div>
              <span />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
