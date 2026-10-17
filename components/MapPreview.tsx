/** Static illustrated map card for the Portal — no Maps key needed. */
export default function MapPreview() {
  const pin = (n: number, left: number, top: number, clay = false) => (
    <div
      key={n}
      className={`absolute flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-paper text-sm font-bold text-ground ${clay ? 'bg-clay' : 'bg-forest'}`}
      style={{ left: `${(left / 560) * 100}%`, top }}
    >
      {n}
    </div>
  );
  return (
    <div className="overflow-hidden rounded-xl2 border border-line bg-paper shadow-card">
      <div className="flex items-center gap-3 border-b border-line2 px-5 py-4">
        <span className="font-display text-[17px] font-bold">Day 3 · Kawaguchiko</span>
        <span className="text-xs text-muted">Sat 12 Dec · driving · 5 stops</span>
        <span className="flex-1" />
        <span className="rounded-pill bg-forest-tint px-2.5 py-1 text-[11px] font-bold text-forest">LIVE ROUTE</span>
      </div>
      <div
        className="relative h-[340px] bg-sand"
        style={{ backgroundImage: 'linear-gradient(#E3DCCB 1px,transparent 1px),linear-gradient(90deg,#E3DCCB 1px,transparent 1px)', backgroundSize: '40px 40px' }}
      >
        <div className="absolute left-10 top-14 h-[150px] w-[220px] bg-forest-soft" style={{ borderRadius: '50% 60% 40% 50%' }} />
        <div className="absolute left-[54%] top-[190px] h-[120px] w-[32%] bg-[#CFE0F0]" style={{ borderRadius: '60% 40% 50% 50%' }} />
        <svg viewBox="0 0 560 340" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <path d="M70 236 C 120 210, 180 230, 230 180 S 330 110, 400 100 S 470 70, 500 50" fill="none" stroke="#C4552D" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 10" />
          <path d="M70 236 C 120 210, 180 230, 230 180" fill="none" stroke="#C4552D" strokeWidth="5" strokeLinecap="round" />
        </svg>
        {pin(1, 52, 218)}
        {pin(2, 212, 162)}
        {pin(3, 382, 82)}
        {pin(4, 482, 32, true)}
        <div style={{ left: '38.2%' }} className="absolute top-[150px] flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-paper shadow-float">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1B1F1C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 17h14l-1.5-5h-11z" />
            <circle cx="7.5" cy="17.5" r="1.5" />
            <circle cx="16.5" cy="17.5" r="1.5" />
            <path d="M7 12V9h10v3" />
          </svg>
        </div>
        <div className="absolute inset-x-4 bottom-4 flex items-center gap-3 rounded-pill border border-line bg-paper px-3.5 py-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-ground">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          </span>
          <span className="bar flex-1 h-1.5"><span className="!bg-clay" style={{ width: '38%' }} /></span>
          <span className="text-xs font-bold tabular-nums">24 / 63 min</span>
          <span className="rounded-pill border border-line px-2 py-0.5 text-xs text-muted">2×</span>
        </div>
      </div>
      <div className="flex gap-2 overflow-hidden px-5 py-3.5">
        {['07:30 Fuji View Run', '12:30 Hoto Fudo', '14:00 Oishi Park'].map((t) => (
          <span key={t} className="whitespace-nowrap rounded-pill border border-line bg-ground px-3 py-1.5 text-xs">
            {t}
          </span>
        ))}
        <span className="whitespace-nowrap rounded-pill border border-forest-line bg-forest-tint px-3 py-1.5 text-xs font-bold text-forest">+ AI</span>
      </div>
    </div>
  );
}
