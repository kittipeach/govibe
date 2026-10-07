# GoVibe 🧭

AI-assisted trip planner: pin places on Google Maps, get AI suggestions, upload flight tickets / hotel bookings and have them auto-pinned onto the itinerary, track budget vs. actual spend — then press **▶** and watch a traveller walk or drive the day's route.

**Stack:** Next.js 14 (App Router, static export) · Supabase (Auth email+password, Postgres + RLS, Storage, Edge Functions) · Google Maps JavaScript API (Places, Directions, Geometry) · Claude (via Edge Functions, key never reaches the browser) · GitHub Pages.

Live: `https://kittipeach.github.io/govibe/`

---

## 1 · Supabase setup (once)

1. Open your project **fkrqjpowuykzdnxypsqs** → **SQL Editor** → paste **`supabase/schema.sql`** → Run.
   Creates `trips / days / stops / bookings / expenses`, RLS policies (each user sees only their own rows) and a private `bookings` storage bucket.
2. **Authentication → Providers → Email**: keep Email enabled. For quick testing turn **off** "Confirm email" (otherwise users must click the confirmation link before logging in).
3. **Authentication → URL Configuration**: Site URL `https://kittipeach.github.io/govibe/`, add `http://localhost:3000/**` to redirect URLs.
4. Deploy the AI functions (needs [Supabase CLI](https://supabase.com/docs/guides/cli)):
   ```bash
   supabase login
   supabase link --project-ref fkrqjpowuykzdnxypsqs
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...        # from console.anthropic.com
   supabase functions deploy ai-recommend
   supabase functions deploy parse-booking
   ```
   Without these two functions the app still works — only **AI suggest** and **booking auto-parse** are disabled.

> 🔐 **Service-role key:** never put it in this repo, `.env`, or any browser code. The app only uses the **anon** key + RLS. If the service-role key was ever pasted anywhere public (including a chat), rotate it: Supabase → Project Settings → API → *Reset service_role key*.

## 2 · Google Maps key

Google Cloud Console → enable **Maps JavaScript API, Places API, Directions API, Geocoding API** → create a browser key → restrict HTTP referrers to `https://kittipeach.github.io/*` and `http://localhost:3000/*`.

## 3 · Run locally

```bash
cp .env.example .env.local      # fill NEXT_PUBLIC_SUPABASE_ANON_KEY + NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
npm install
npm run dev                      # http://localhost:3000
```

## 4 · Deploy to GitHub Pages

1. Repo → **Settings → Secrets and variables → Actions → New repository secret** ×3:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
2. Repo → **Settings → Pages → Source: GitHub Actions**.
3. Push to `main` — `.github/workflows/deploy-pages.yml` builds with `GITHUB_PAGES=true` (sets `basePath=/govibe`) and publishes `out/`.

## Features map

| Area | Where |
|---|---|
| Email/password auth | `components/AuthForm.tsx`, `components/RequireAuth.tsx` |
| Trips list + create (auto-creates one `day` per date) | `app/trips/page.tsx`, `lib/db.ts` |
| Trip workspace (tabs) | `app/trip/page.tsx?id=…` |
| Google Maps: Places search, click-to-pin, Directions route, animated 🚶/🚗/🚆/🚲 marker with play/pause/speed/scrub | `components/RouteMap.tsx`, `lib/maps.ts` |
| Itinerary editor: per-day stops, reorder, times, cost, travel mode | `components/Itinerary.tsx` |
| AI recommendations (Claude) → tick to add to day | `components/AiPanel.tsx`, `supabase/functions/ai-recommend` |
| Upload ticket / hotel PDF or image → parsed → auto-pinned stops + budget line | `components/Bookings.tsx`, `supabase/functions/parse-booking` |
| Budget vs actual, per category, FX to home currency, per person | `components/Budget.tsx` |
| Schema + RLS + storage policy | `supabase/schema.sql` |

## Data model

```
trips ─┬─ days ──┬─ stops (lat/lng, kind, time, cost, source: manual|ai|booking)
       │         └─ expenses (planned | actual)
       └─ bookings (parsed flight/hotel/train; file in storage bucket `bookings/<uid>/<trip>/…`)
```

## Roadmap ideas

- Drag-and-drop between days · share a read-only trip link · export the plan to the single-file HTML format · offline PWA · photo albums per stop (Wikimedia/Openverse like the original planner).
