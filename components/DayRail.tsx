'use client';
import type { Day, Stop } from '@/lib/types';

interface Props {
  days: Day[];
  stops: Stop[];
  selectedDayId: string | null;
  onSelectDay: (id: string) => void;
}

/** Left rail on desktop, horizontal scroller on small screens. */
export default function DayRail({ days, stops, selectedDayId, onSelectDay }: Props) {
  return (
    <aside className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:border-r lg:border-line lg:pr-3">
      <span className="hidden px-2 pb-1.5 text-[11px] font-bold uppercase tracking-[.08em] text-muted lg:block">Days</span>
      {days.map((d, i) => {
        const n = stops.filter((s) => s.day_id === d.id).length;
        const active = d.id === selectedDayId;
        return (
          <button
            key={d.id}
            onClick={() => onSelectDay(d.id)}
            className={`flex min-w-[140px] flex-col rounded-lg2 px-3 py-2 text-left transition lg:min-w-0 ${active ? 'bg-forest text-ground' : 'hover:bg-paper'}`}
            aria-current={active ? 'true' : undefined}
          >
            <span className={`text-[11px] ${active ? 'text-forest-line' : 'text-muted'}`}>{fmtDate(d.date)}</span>
            <span className="truncate text-sm font-bold">
              {i + 1} · {d.title.replace(/^Day \d+$/, '') || 'Untitled'}
            </span>
            <span className={`text-[11px] ${active ? 'text-forest-soft' : 'text-muted'}`}>{n ? `${n} stops` : 'empty'}</span>
          </button>
        );
      })}
    </aside>
  );
}

export function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
