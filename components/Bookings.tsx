'use client';
import { useEffect, useState } from 'react';
import { callFunction } from '@/lib/supabase';
import { listBookings, uploadBookingFile, addBooking, deleteBooking, addStops, signedBookingUrl, addExpense } from '@/lib/db';
import type { Booking, BookingType, Day, Stop, Trip } from '@/lib/types';

interface Props {
  trip: Trip;
  days: Day[];
  stops: Stop[];
  onChange: () => void;
}

interface ParsedBooking {
  type: BookingType;
  title: string;
  provider?: string;
  reference?: string;
  start_at?: string; // ISO
  end_at?: string;
  from_name?: string;
  to_name?: string;
  from_lat?: number;
  from_lng?: number;
  to_lat?: number;
  to_lng?: number;
  cost?: number;
  currency?: string;
  summary?: string;
}

/**
 * Upload a ticket / hotel confirmation. The `parse-booking` Edge Function reads the file with Claude,
 * returns structured fields, and we auto-pin stops onto the matching day(s).
 */
export default function Bookings({ trip, days, stops, onChange }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [busy, setBusy] = useState<string>('');
  const [err, setErr] = useState('');
  const [over, setOver] = useState(false);
  const [preview, setPreview] = useState<{ file: File; path: string; parsed: ParsedBooking } | null>(null);

  const load = () => listBookings(trip.id).then(setBookings).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);

  async function handleFile(file: File) {
    setErr('');
    setPreview(null);
    try {
      setBusy('Uploading…');
      const path = await uploadBookingFile(trip.id, file);
      setBusy('Reading the document with AI…');
      const b64 = await fileToBase64(file);
      const res = await callFunction<{ booking: ParsedBooking }>('parse-booking', {
        filename: file.name,
        mime: file.type || 'application/octet-stream',
        data: b64,
        trip: { destination: trip.destination, start_date: trip.start_date, end_date: trip.end_date, currency: trip.currency },
      });
      setPreview({ file, path, parsed: res.booking });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function confirmPreview() {
    if (!preview) return;
    const p = preview.parsed;
    setBusy('Saving & pinning…');
    try {
      const b = await addBooking({
        trip_id: trip.id,
        type: p.type,
        title: p.title,
        file_path: preview.path,
        provider: p.provider ?? null,
        reference: p.reference ?? null,
        start_at: p.start_at ?? null,
        end_at: p.end_at ?? null,
        from_name: p.from_name ?? null,
        to_name: p.to_name ?? null,
        from_lat: p.from_lat ?? null,
        from_lng: p.from_lng ?? null,
        to_lat: p.to_lat ?? null,
        to_lng: p.to_lng ?? null,
        cost: p.cost ?? null,
        currency: p.currency ?? null,
        parsed: p as unknown as Record<string, unknown>,
      });
      await autoPin(b);
      if (p.cost) {
        await addExpense({ trip_id: trip.id, category: p.type === 'flight' ? 'flight' : p.type === 'hotel' ? 'lodging' : 'transport', title: p.title, amount: p.currency && p.currency !== trip.currency ? p.cost : p.cost, planned: true });
      }
      setPreview(null);
      load();
      onChange();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  /** Create stops from a booking: flights → departure + arrival airports; hotels → check-in day + each night. */
  async function autoPin(b: Booking) {
    const rows: (Partial<Stop> & { trip_id: string })[] = [];
    const dayFor = (iso: string | null) => (iso ? days.find((d) => d.date === iso.slice(0, 10)) ?? null : null);
    const countFor = (dayId: string) => stops.filter((s) => s.day_id === dayId).length + rows.filter((r) => r.day_id === dayId).length;

    if (b.type === 'flight') {
      const dep = dayFor(b.start_at);
      const arr = dayFor(b.end_at ?? b.start_at);
      if (dep && b.from_lat != null)
        rows.push({ trip_id: trip.id, day_id: dep.id, name: `✈ Depart ${b.from_name ?? ''}`.trim(), kind: 'flight', lat: b.from_lat, lng: b.from_lng, start_time: hhmm(b.start_at), note: `${b.provider ?? ''} ${b.reference ?? ''}`.trim(), sort: -100, source: 'booking', booking_id: b.id });
      if (arr && b.to_lat != null)
        rows.push({ trip_id: trip.id, day_id: arr.id, name: `✈ Arrive ${b.to_name ?? ''}`.trim(), kind: 'flight', lat: b.to_lat, lng: b.to_lng, start_time: hhmm(b.end_at), note: `${b.provider ?? ''} ${b.reference ?? ''}`.trim(), sort: arr.id === dep?.id ? -99 : -100, source: 'booking', booking_id: b.id });
    } else if (b.type === 'hotel' && b.to_lat != null) {
      const inDay = dayFor(b.start_at);
      const outDay = dayFor(b.end_at);
      const span = days.filter((d) => inDay && d.sort >= inDay.sort && (!outDay || d.sort < outDay.sort));
      span.forEach((d, i) => {
        rows.push({ trip_id: trip.id, day_id: d.id, name: `🏨 ${b.title}${i === 0 ? ' (check-in)' : ''}`, kind: 'hotel', lat: b.to_lat, lng: b.to_lng, address: b.to_name, note: b.reference ? `Ref ${b.reference}` : null, sort: 1000, source: 'booking', booking_id: b.id, cost: i === 0 ? b.cost : null });
      });
      if (outDay) rows.push({ trip_id: trip.id, day_id: outDay.id, name: `🏨 ${b.title} (check-out)`, kind: 'hotel', lat: b.to_lat, lng: b.to_lng, address: b.to_name, sort: -100, source: 'booking', booking_id: b.id });
    } else {
      const d = dayFor(b.start_at);
      if (d && (b.from_lat != null || b.to_lat != null)) {
        if (b.from_lat != null) rows.push({ trip_id: trip.id, day_id: d.id, name: `${b.title} · from ${b.from_name ?? ''}`, kind: 'transport', lat: b.from_lat, lng: b.from_lng, start_time: hhmm(b.start_at), sort: countFor(d.id), source: 'booking', booking_id: b.id });
        if (b.to_lat != null) rows.push({ trip_id: trip.id, day_id: d.id, name: `${b.title} · to ${b.to_name ?? ''}`, kind: 'transport', lat: b.to_lat, lng: b.to_lng, start_time: hhmm(b.end_at), sort: countFor(d.id) + 1, source: 'booking', booking_id: b.id });
      }
    }
    await addStops(rows);
  }

  return (
    <div className="stack">
      <div
        className={`dropzone ${over ? 'over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        onClick={() => document.getElementById('bookingFile')?.click()}
      >
        <input id="bookingFile" type="file" accept=".pdf,image/*" hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        <div style={{ fontSize: '2rem' }}>🎫</div>
        <strong>Drop a flight ticket, hotel confirmation or train/bus booking</strong>
        <p className="muted small" style={{ margin: '.3rem 0 0' }}>
          PDF or image. GoVibe reads it, pins the airports / hotel on the right days, and adds the cost to your budget.
          <span className="th">วางไฟล์ตั๋วเครื่องบิน / ใบจองโรงแรม (PDF หรือรูป) ระบบจะอ่านข้อมูล ปักหมุดสนามบิน/โรงแรมลงวันที่ถูกต้อง และใส่ค่าใช้จ่ายเข้างบให้</span>
        </p>
        {busy && (
          <p className="small" style={{ marginTop: '.6rem' }}>
            <span className="spinner" /> {busy}
          </p>
        )}
      </div>
      {err && <div className="alert error">{err}</div>}

      {preview && (
        <div className="card stack">
          <h3>Check what we read from “{preview.file.name}”</h3>
          <div className="form-grid">
            <Field label="Type" v={preview.parsed.type} />
            <Field label="Title" v={preview.parsed.title} />
            <Field label="Provider" v={preview.parsed.provider} />
            <Field label="Reference" v={preview.parsed.reference} />
            <Field label="From" v={preview.parsed.from_name} />
            <Field label="To / Hotel" v={preview.parsed.to_name} />
            <Field label="Start" v={preview.parsed.start_at} />
            <Field label="End" v={preview.parsed.end_at} />
            <Field label="Cost" v={preview.parsed.cost != null ? `${preview.parsed.cost} ${preview.parsed.currency ?? ''}` : undefined} />
          </div>
          {preview.parsed.summary && <p className="small muted">{preview.parsed.summary}</p>}
          <div className="row">
            <button className="btn primary" onClick={confirmPreview} disabled={!!busy}>
              Looks right — save & auto-pin
            </button>
            <button className="btn" onClick={() => setPreview(null)}>
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Bookings ({bookings.length})</h3>
        {bookings.length === 0 && <p className="muted small">Nothing uploaded yet.</p>}
        {bookings.map((b) => (
          <div className="stop" key={b.id}>
            <div className="icon">{b.type === 'flight' ? '✈️' : b.type === 'hotel' ? '🏨' : '🎫'}</div>
            <div>
              <div className="name">{b.title}</div>
              <div className="meta">
                {b.provider && <>{b.provider} · </>}
                {b.reference && <>Ref {b.reference} · </>}
                {b.start_at && <>{b.start_at.replace('T', ' ').slice(0, 16)}</>}
                {b.end_at && <> → {b.end_at.replace('T', ' ').slice(0, 16)}</>}
                {b.cost != null && <> · {b.cost} {b.currency}</>}
              </div>
            </div>
            <div className="row" style={{ gap: '.1rem' }}>
              {b.file_path && (
                <button className="icon-btn" title="Open file" onClick={async () => window.open(await signedBookingUrl(b.file_path!), '_blank')}>
                  📄
                </button>
              )}
              <button
                className="icon-btn"
                title="Delete booking (and its auto-pinned stops)"
                onClick={async () => {
                  if (confirm('Delete this booking and the stops it created?')) {
                    await deleteBooking(b.id);
                    load();
                    onChange();
                  }
                }}
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, v }: { label: string; v?: string | number | null }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="input" style={{ background: 'transparent' }}>
        {v ?? <span className="muted">—</span>}
      </div>
    </div>
  );
}

function hhmm(iso: string | null | undefined) {
  return iso && iso.length >= 16 ? iso.slice(11, 16) : null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
