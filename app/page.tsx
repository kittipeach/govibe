import Link from 'next/link';
import MapPreview from '@/components/MapPreview';

const FEATURES = [
  {
    title: 'Pin and order',
    th: 'ปักหมุด จัดลำดับ ใส่เวลาและค่าใช้จ่าย',
    body: 'Search Google Places or click the map. Each stop keeps a time, a cost and a note; reorder the day in a tap.',
    icon: <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />,
    clay: false,
  },
  {
    title: "Ask what's nearby",
    th: 'AI แนะนำร้าน/จุดเที่ยวใกล้แผนวันนั้น',
    body: '"Ramen under ¥1,500 near the station" returns real places with coordinates and a one-line reason. Tick to add.',
    icon: <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4zM19 15l.8 2 2.2.6-2.2.7L19 20l-.8-1.7-2.2-.7 2.2-.6z" />,
    clay: true,
  },
  {
    title: 'Upload the booking',
    th: 'อัปโหลดตั๋ว/ที่พัก ระบบปักหมุดให้อัตโนมัติ',
    body: 'A flight e-ticket or hotel PDF becomes airports and hotel nights on the right days, plus a line in the budget.',
    icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M8 15h4" /></>,
    clay: false,
  },
  {
    title: 'Play the route',
    th: 'กดเล่นดูตัวละครเดิน/ขับรถตามเส้นทาง',
    body: 'Directions draws the real route; a walking or driving figure moves along it so you can feel the pacing.',
    icon: <><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l5.5-3.5z" /></>,
    clay: true,
  },
];

const SAMPLE = [
  ['Day 3 · Sat 12 Dec', 'Fuji View Run', '07:30 start · bib pickup day before'],
  ['Day 5 · Mon 14 Dec', 'Tsugaike ski lesson', '08:00–16:00 private · English'],
  ['Day 7 · Wed 16 Dec', 'Shirahone Onsen', 'milky-white bath · snow'],
  ['Day 9 · Fri 18 Dec', 'Snow monkeys 09:00', 'leave 06:00 · first bath'],
];

export default function Home() {
  return (
    <>
      {/* hero */}
      <section className="grid items-center gap-12 py-10 lg:grid-cols-[1.05fr_.95fr] lg:py-16">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[.08em] text-clay">
            <span className="inline-block h-0.5 w-6 bg-clay" />
            Trip planner for people who like the ground under their feet
          </div>
          <h1 className="font-display text-[clamp(2.6rem,6vw,4.25rem)] font-medium leading-[1.02] tracking-[-.02em]">
            Plan the trip.
            <br />
            Pin the places.
            <br />
            <em className="italic text-forest">Press play.</em>
          </h1>
          <p className="max-w-[520px] text-lg leading-relaxed text-ink2">
            Drop your flight ticket and hotel booking in, let GoVibe pin them on the map and sketch each day, ask for
            what&apos;s worth seeing nearby, then watch a little traveller walk the route before you do.
          </p>
          <p className="max-w-[520px] text-[15px] leading-relaxed text-muted">
            วางแผนทริปทีละวัน อัปโหลดตั๋ว/ที่พักให้ระบบปักหมุดและสร้างแผนให้ แล้วกดเล่นดูเส้นทางบนแผนที่
          </p>
          <div className="mt-2 flex flex-wrap gap-3.5">
            <Link href="/signup/" className="btn-primary px-6 py-4 text-base">
              Start a free trip
            </Link>
            <Link href="/login/" className="btn-outline px-5 py-4 text-base">
              I already have an account
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {[
              ['10 days', 'planned in the sample Japan trip'],
              ['38 stops', 'pinned, 7 from uploaded bookings'],
              ['2 currencies', 'budget in JPY, shown in THB'],
            ].map(([n, l]) => (
              <div key={n}>
                <div className="font-display text-3xl font-bold">{n}</div>
                <div className="text-xs text-muted">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <MapPreview />
      </section>

      {/* features */}
      <section id="how" className="flex flex-col gap-7 py-10">
        <div className="flex flex-wrap items-baseline gap-5">
          <h2 className="font-display text-[2.25rem] font-medium">Four things it does well</h2>
          <span className="text-[15px] text-muted">Everything else is a plain, fast list.</span>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card flex flex-col gap-3 p-6">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={f.clay ? '#C4552D' : '#1F4D3A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {f.icon}
              </svg>
              <h3 className="font-display text-[22px] font-bold">
                {f.title}
                <span className="th">{f.th}</span>
              </h3>
              <p className="text-[15px] leading-relaxed text-ink2">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* sample trip */}
      <section className="my-6 grid items-center gap-10 rounded-[28px] bg-forest p-8 text-ground sm:p-12 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-3.5">
          <span className="text-[13px] font-bold uppercase tracking-[.08em] text-forest-line">Sample trip</span>
          <h2 className="font-display text-[2.25rem] font-medium leading-[1.1]">Mt. Fuji run, Hakuba snow, Tokyo shopping — 10 Dec → 20 Dec</h2>
          <p className="text-base leading-relaxed text-forest-soft">Open it, duplicate it, change the dates. Every stop, booking and budget line is editable.</p>
          <Link href="/signup/" className="mt-1.5 self-start rounded-pill bg-ground px-5 py-3.5 text-[15px] font-bold text-forest">
            Open the sample →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {SAMPLE.map(([d, t, s]) => (
            <div key={t} className="rounded-2xl border border-ground/20 bg-ground/[.08] p-4">
              <div className="text-xs text-forest-line">{d}</div>
              <div className="mt-1 font-display text-xl font-bold">{t}</div>
              <div className="mt-1.5 text-xs text-forest-soft">{s}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
