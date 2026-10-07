import Link from 'next/link';

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>Plan the trip. Pin the places. Press play.</h1>
        <p className="muted" style={{ maxWidth: 640, fontSize: '1.05rem' }}>
          GoVibe turns a rough idea into a day-by-day itinerary: pin spots on Google Maps, let AI suggest what&apos;s
          nearby, upload your flight tickets and hotel bookings to auto-fill the plan, then watch a little traveller
          walk or drive the whole route.
          <span className="th">วางแผนทริปทีละวัน ปักหมุดสถานที่ ให้ AI แนะนำจุดใกล้เคียง อัปโหลดตั๋วเครื่องบิน/ที่พักให้ระบบปักหมุดและสร้างแผนให้อัตโนมัติ แล้วกด play ดูตัวละครเดิน/ขับรถตามเส้นทาง</span>
        </p>
        <div className="row" style={{ marginTop: '1.2rem' }}>
          <Link href="/signup/" className="btn primary">
            Start a trip →
          </Link>
          <Link href="/login/" className="btn">
            I already have an account
          </Link>
        </div>
      </section>

      <section className="grid grid-3">
        <Feature icon="📍" title="Pin & plan" th="ปักหมุด + จัดวัน">
          Search any place, drop it on a day, drag to reorder. Each stop keeps time, cost and notes.
        </Feature>
        <Feature icon="✨" title="AI recommendations" th="AI แนะนำจุดเที่ยว">
          Ask for food, viewpoints, onsen or shopping near your current stops — one click adds them to the day.
        </Feature>
        <Feature icon="🎫" title="Upload bookings" th="อัปโหลดตั๋ว/ที่พัก">
          Drop in a flight ticket or hotel confirmation (PDF/image). GoVibe reads it and pins airports and hotels
          onto the right day automatically.
        </Feature>
        <Feature icon="▶️" title="Route playback" th="เล่นเส้นทางบนแผนที่">
          Google Maps Directions draws the route; a walking or driving marker animates along it with play, pause,
          speed and scrub controls.
        </Feature>
        <Feature icon="💴" title="Budget & expenses" th="งบประมาณ + ค่าใช้จ่ายจริง">
          Plan a budget per category, log real spending, and see the burn-down in both currencies.
        </Feature>
        <Feature icon="🔒" title="Yours only" th="ข้อมูลเป็นส่วนตัว">
          Email + password login with Supabase. Row-level security means nobody else can read your trips.
        </Feature>
      </section>
    </>
  );
}

function Feature({ icon, title, th, children }: { icon: string; title: string; th: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div style={{ fontSize: '1.6rem' }}>{icon}</div>
      <h3 style={{ marginTop: '.4rem' }}>
        {title}
        <span className="th">{th}</span>
      </h3>
      <p className="muted small" style={{ marginBottom: 0 }}>
        {children}
      </p>
    </div>
  );
}
