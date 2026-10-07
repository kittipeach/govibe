'use client';
import { useEffect, useMemo, useState } from 'react';
import { listExpenses, addExpense, deleteExpense, updateTrip, fmtMoney } from '@/lib/db';
import type { Day, Expense, ExpenseCategory, Stop, Trip } from '@/lib/types';
import { CATEGORY_LABEL } from '@/lib/types';

interface Props {
  trip: Trip;
  days: Day[];
  stops: Stop[];
  onChange: () => void;
}

export default function Budget({ trip, days, stops, onChange }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [err, setErr] = useState('');
  const [f, setF] = useState({ category: 'food' as ExpenseCategory, title: '', amount: '', planned: false, day_id: '' });

  const load = () => listExpenses(trip.id).then(setExpenses).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id]);

  const stopCosts = useMemo(() => stops.reduce((a, s) => a + (s.cost ?? 0), 0), [stops]);
  const planned = expenses.filter((e) => e.planned).reduce((a, e) => a + e.amount, 0) + stopCosts;
  const actual = expenses.filter((e) => !e.planned).reduce((a, e) => a + e.amount, 0);
  const budget = trip.budget_total ?? 0;
  const toHome = (n: number) => fmtMoney(n * trip.fx_rate, trip.home_currency);

  const byCat = useMemo(() => {
    const m: Record<string, { planned: number; actual: number }> = {};
    const bump = (c: string, k: 'planned' | 'actual', v: number) => ((m[c] ??= { planned: 0, actual: 0 })[k] += v);
    expenses.forEach((e) => bump(e.category, e.planned ? 'planned' : 'actual', e.amount));
    stops.forEach((s) => s.cost && bump(s.kind === 'food' ? 'food' : s.kind === 'hotel' ? 'lodging' : s.kind === 'flight' || s.kind === 'transport' ? 'transport' : s.kind === 'shop' ? 'shopping' : 'activity', 'planned', s.cost));
    return m;
  }, [expenses, stops]);

  return (
    <div className="grid grid-2">
      <div className="stack">
        <div className="card">
          <div className="row">
            <h3 style={{ margin: 0 }}>Budget</h3>
            <span className="spacer" />
            <input
              className="input"
              style={{ width: 140 }}
              type="number"
              defaultValue={trip.budget_total ?? ''}
              placeholder="total"
              onBlur={async (e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                if (v !== trip.budget_total) {
                  await updateTrip(trip.id, { budget_total: v });
                  onChange();
                }
              }}
            />
            <span className="muted small">{trip.currency}</span>
          </div>
          <Stat label="Planned" v={planned} cur={trip.currency} sub={toHome(planned)} />
          <Stat label="Spent so far" v={actual} cur={trip.currency} sub={toHome(actual)} />
          <Stat label="Remaining vs budget" v={budget - Math.max(planned, actual)} cur={trip.currency} sub={budget ? `${Math.round((Math.max(planned, actual) / budget) * 100)}% used` : 'set a budget'} />
          {budget > 0 && (
            <div className="bar" style={{ marginTop: '.6rem' }}>
              <span style={{ width: `${Math.min(100, (Math.max(planned, actual) / budget) * 100)}%` }} />
            </div>
          )}
          <p className="muted small" style={{ marginTop: '.6rem', marginBottom: 0 }}>
            FX 1 {trip.currency} = {trip.fx_rate} {trip.home_currency} · {trip.travellers} travellers → {fmtMoney((Math.max(planned, actual) * trip.fx_rate) / trip.travellers, trip.home_currency)} per person
          </p>
        </div>

        <div className="card">
          <h3>By category</h3>
          <table className="tbl">
            <thead>
              <tr>
                <th>Category</th>
                <th className="num">Planned</th>
                <th className="num">Actual</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(CATEGORY_LABEL).map(([k, label]) => (
                <tr key={k}>
                  <td>{label}</td>
                  <td className="num">{fmtMoney(byCat[k]?.planned ?? 0, trip.currency)}</td>
                  <td className="num">{fmtMoney(byCat[k]?.actual ?? 0, trip.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small" style={{ marginTop: '.5rem', marginBottom: 0 }}>
            Planned includes costs on itinerary stops and uploaded bookings.
          </p>
        </div>
      </div>

      <div className="stack">
        <form
          className="card stack"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await addExpense({ trip_id: trip.id, category: f.category, title: f.title, amount: Number(f.amount), planned: f.planned, day_id: f.day_id || null });
              setF({ ...f, title: '', amount: '' });
              load();
            } catch (er) {
              setErr((er as Error).message);
            }
          }}
        >
          <h3>Add expense</h3>
          <div className="form-grid">
            <div className="field">
              <label>Category</label>
              <select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as ExpenseCategory })}>
                {Object.entries(CATEGORY_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Amount ({trip.currency})</label>
              <input className="input" type="number" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>What</label>
              <input className="input" required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Hoto dinner · Kawaguchiko" />
            </div>
            <div className="field">
              <label>Day</label>
              <select className="input" value={f.day_id} onChange={(e) => setF({ ...f, day_id: e.target.value })}>
                <option value="">—</option>
                {days.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title} · {d.date}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Kind</label>
              <select className="input" value={f.planned ? 'planned' : 'actual'} onChange={(e) => setF({ ...f, planned: e.target.value === 'planned' })}>
                <option value="actual">Actual spend</option>
                <option value="planned">Planned / budget line</option>
              </select>
            </div>
          </div>
          <div className="row">
            <button className="btn primary sm">Add</button>
          </div>
          {err && <div className="alert error">{err}</div>}
        </form>

        <div className="card">
          <h3>Entries ({expenses.length})</h3>
          {expenses.length === 0 && <p className="muted small">No expenses yet.</p>}
          <table className="tbl">
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td>
                    {e.title}
                    <div className="muted small">
                      {CATEGORY_LABEL[e.category]} · {e.planned ? 'planned' : 'actual'}
                      {e.day_id && <> · {days.find((d) => d.id === e.day_id)?.title}</>}
                    </div>
                  </td>
                  <td className="num">{fmtMoney(e.amount, trip.currency)}</td>
                  <td style={{ width: 30 }}>
                    <button
                      className="icon-btn"
                      onClick={async () => {
                        await deleteExpense(e.id);
                        load();
                      }}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, v, cur, sub }: { label: string; v: number; cur: string; sub?: string }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', padding: '.45rem 0', borderBottom: '1px solid var(--line)' }}>
      <span className="muted small">{label}</span>
      <span style={{ textAlign: 'right' }}>
        <strong>{fmtMoney(v, cur)}</strong>
        {sub && <div className="muted small">{sub}</div>}
      </span>
    </div>
  );
}
