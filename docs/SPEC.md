# GoVibe — Product & Technical Spec

As of 2026-10-07 · Kittipeach Deenu · Live doc: https://claude.ai/code/artifact/9f609f96-3b46-43cc-9c14-7fcda1df2fe4

GoVibe is a personal trip planner (Next.js 14 static export + Supabase + Google Maps + Claude) that turns bookings and pinned places into a day-by-day itinerary with animated route playback and a two-currency budget. v1 is live at kittipeach.github.io/govibe; this spec records what it does, how it is built, and the UI direction being implemented.

## 1. Goals & scope

GoVibe exists so one traveller (or a couple) can go from "we booked flights" to an hour-by-hour plan with a map, without spreadsheets. The sample content is the Japan winter trip (10–20 Dec 2026: Fuji View Run, Tsugaike ski, Shirahone Onsen, Tokyo shopping) and every feature is judged against that trip.

**Users.** A single owner per trip, logged in with email + password. No sharing or collaboration in v1.

**v1 does**

- Create a trip (title, destination, dates, travellers, trip currency, home currency, FX rate, budget) and auto-create one day per date.
- Pin stops on Google Maps by Places search or map click; give each a type, time, cost, note; reorder within a day.
- Ask Claude for places near the selected day's stops and add chosen ones in one click.
- Upload a flight e-ticket, hotel confirmation or rail/bus booking (PDF or image); Claude extracts fields; the app auto-pins airports or hotel nights on the right days and adds a budget line.
- Draw the day's route with Google Directions and animate a walking / driving / transit / bike marker along it (play, pause, restart, 0.5–4× speed, scrub).
- Track budget vs planned vs actual by category, in trip currency with a home-currency conversion and per-person figure.
- Deploy as a static site on GitHub Pages; all data lives in Supabase under row-level security.

**v1 does not**

- Share trips, invite collaborators, or publish read-only links.
- Book anything, check live prices, or sync with airline/hotel APIs.
- Work offline or as an installable PWA.
- Store the Anthropic key or any Supabase secret in the browser; AI runs only in Supabase Edge Functions.

**Success in one line.** The owner can rebuild the full 10-day Japan plan — 38 stops, 7 of them from uploaded bookings — in under an hour and watch every day play on the map.

## 2. User journeys

**J1 — First trip (Portal → Sign up → Trips → Trip)**

1. Land on the Portal, click **Start a trip**.
2. Sign up with email + password; if email confirmation is on, confirm and log in.
3. On **My trips**, click **New trip**, fill title, destination, dates, travellers, currencies, FX, budget.
4. The trip opens on **Plan & map** with one empty day per date, Day 1 selected.

**J2 — Pin a day by hand (Trip › Plan & map)**

1. Pick a day in the day rail; set its travel mode (drive / walk / transit / bike).
2. Type a place into the Places search or click the map; a banner shows the picked place.
3. Choose **Add to Day N**; the stop appears with a numbered pin and the route redraws.
4. Edit the stop (type, start/end time, cost, note) or reorder with ▲▼; delete if wrong.

**J3 — Fill gaps with AI (Trip › AI suggest)**

1. With a day selected, click a quick prompt (food, viewpoints, onsen, shopping…) or type a request.
2. Review 5–8 suggestions with reason (EN + TH), estimated cost and best time.
3. Tick the ones to keep, click **Add to Day N**; they appear as stops tagged *AI*.

**J4 — Upload a booking (Trip › Bookings)**

1. Drop a PDF/image of a flight e-ticket, hotel confirmation or rail ticket.
2. The file uploads to private storage; Claude extracts type, provider, reference, times, places, coordinates, cost.
3. Check the extracted fields in the preview; click **Save & auto-pin**.
4. The app creates stops: departure/arrival airports on their days, or hotel check-in, each night and check-out; a planned budget line is added.

**J5 — Play and budget (Trip › Plan & map, Budget)**

1. With ≥ 2 pinned stops, press ▶; the traveller marker follows the Directions route, the map pans to keep it in view.
2. Change speed, scrub the bar, restart; switch day to play another.
3. On **Budget**, set the total, add actual spend as it happens, watch planned vs spent vs headroom and the per-person THB figure.

## 3. Functional requirements

*Done* = in the repo today; *Next* = part of the UI implementation pass; *Later* = backlog.

**Auth**

| ID | Requirement | Acceptance | Status |
| --- | --- | --- | --- |
| AUTH-1 | Sign up with email + password (min 6 chars) | New user lands on My trips, or sees "check your email" when confirmation is on | Done |
| AUTH-2 | Log in / log out; session persists across reloads | Reload keeps the user signed in; Sign out returns to Portal | Done |
| AUTH-3 | Protected routes | /trips and /trip redirect to /login when signed out | Done |
| AUTH-4 | Password reset by email | Reset link sends and sets a new password | Next |

**Trips**

| ID | Requirement | Acceptance | Status |
| --- | --- | --- | --- |
| TRIP-1 | Create trip with title, destination, dates, travellers, currency, home currency, FX, budget | One `days` row per date created, Day N titles | Done |
| TRIP-2 | List, open, delete trips | Delete cascades days, stops, bookings, expenses | Done |
| TRIP-3 | Edit trip fields after creation | Change dates adds/removes days without losing stops | Next |
| TRIP-4 | Duplicate a trip (e.g. the sample) | Copy with new dates, stops shifted by day index | Later |

**Itinerary**

| ID | Requirement | Acceptance | Status |
| --- | --- | --- | --- |
| ITN-1 | Add a stop to a day by Places search, map click, or manual form | Stop saved with lat/lng when known; "no pin" badge when not | Done |
| ITN-2 | Stop fields: name, type (8 kinds), start/end time, cost, note, lat/lng, address | Form validates name; cost numeric | Done |
| ITN-3 | Reorder stops within a day; move a stop to another day | ▲▼ reorder done; cross-day move via day picker | Done / Next |
| ITN-4 | Per-day title and travel mode | Travel mode changes the route and the marker icon | Done |
| ITN-5 | Day cost = sum of stop costs; trip cost rolls into Budget | Figures match Budget tab | Done |
| ITN-6 | Drag-and-drop reorder (desktop + touch) | Replaces ▲▼ | Next |

**Map & playback**

| ID | Requirement | Acceptance | Status |
| --- | --- | --- | --- |
| MAP-1 | Numbered pins for the selected day; faint pins for other days | Pins update on every change | Done |
| MAP-2 | Directions route in the day's travel mode, with distance and duration | Straight-line fallback with notice when Directions fails | Done |
| MAP-3 | Animated traveller marker with play, pause, restart, speed 0.5–4×, scrub | Marker heading follows the path; map pans to keep it in view | Done |
| MAP-4 | Click a pin to see name, time, note | Info window | Done |
| MAP-5 | Keyboard: space = play/pause, ←→ = scrub 5% | Accessible controls | Next |
| MAP-6 | Elapsed time shown as route time × progress | "24 / 63 min" style readout | Done |

**AI recommendations**

| ID | Requirement | Acceptance | Status |
| --- | --- | --- | --- |
| AI-1 | Quick prompts + free text, scoped to the selected day's stops and whole-trip exclusions | 5–8 results with name, kind, lat/lng, reason EN+TH, est. cost, best time | Done |
| AI-2 | Tick to add selected results as stops tagged `ai` | Added at end of day, cost and time carried over | Done |
| AI-3 | Results drawn on the map as ghost pins before adding | Preview before commit | Next |
| AI-4 | Key never in browser; function requires a signed-in user | Function rejects anonymous calls | Done |

**Bookings**

| ID | Requirement | Acceptance | Status |
| --- | --- | --- | --- |
| BK-1 | Upload PDF/JPG/PNG/WEBP ≤ 15 MB to private bucket `bookings/<uid>/<trip>/` | Only the owner can read the file (signed URL) | Done |
| BK-2 | Parse with Claude into the booking schema; show preview before saving | User can discard | Done |
| BK-3 | Auto-pin: flight → depart + arrive stops; hotel → check-in, each night, check-out; other → from/to stops | Stops tagged `booking`, deleted with the booking | Done |
| BK-4 | Add planned expense from booking cost | Category flight / lodging / transport | Done |
| BK-5 | Edit extracted fields before saving | Inline form in preview | Next |
| BK-6 | Multi-segment tickets (round trip in one PDF) | Both segments pinned | Later |

**Budget**

| ID | Requirement | Acceptance | Status |
| --- | --- | --- | --- |
| BUD-1 | Budget total editable; planned = expenses(planned) + stop costs; actual = expenses(actual) | Totals in trip currency and home currency | Done |
| BUD-2 | Breakdown by 7 categories, planned vs actual | Table matches entries | Done |
| BUD-3 | Per-person figure = max(planned, actual) × FX ÷ travellers | Shown on the summary | Done |
| BUD-4 | Add / delete expense with category, amount, day, planned/actual | Entry list updates live | Done |
| BUD-5 | Per-day spend view and a daily burn chart | Chart of planned vs actual by day | Next |
| BUD-6 | Export CSV | Download of all entries | Later |

## 4. Architecture

```
Browser (Next.js 14 static, GitHub Pages)
  ├─ publishable key ──► Supabase Auth (email+password, JWT)
  │                      Postgres + RLS (trips, days, stops, bookings, expenses)
  │                      Storage (private bucket bookings/<uid>/<trip>/)
  │                      Edge Functions (Deno): ai-recommend, parse-booking ──secret──► Claude API
  └─ browser key (referrer-restricted) ──► Google Maps JS API (Places, Directions, Geocoding)
```

The static site needs no server of its own: the browser reads and writes its own rows through PostgREST under row-level security, uploads files to a private bucket, and calls two Edge Functions for anything that needs the Anthropic key.

| Layer | Technology | Lives in |
| --- | --- | --- |
| Frontend | Next.js 14 App Router, `output: 'export'`, TypeScript, Tailwind 3.4 | `app/`, `components/`, `lib/` |
| Data access | `@supabase/supabase-js` 2.45 with the publishable key | `lib/supabase.ts`, `lib/db.ts` |
| Map | Google Maps JS API via `@googlemaps/js-api-loader` | `lib/maps.ts`, `components/RouteMap.tsx` |
| Backend | Supabase Auth, Postgres + RLS, Storage, Edge Functions (Deno) | `supabase/schema.sql`, `supabase/functions/` |
| AI | Claude via the Messages API, called only from Edge Functions | `supabase/functions/_shared/anthropic.ts` |
| Hosting | GitHub Pages from a GitHub Actions build, `basePath /govibe` | `.github/workflows/deploy-pages.yml` |

## 5. Data model

Five tables, all owned through `trips.user_id`; every child table is protected by `owns_trip(trip_id)`. Schema file: `supabase/schema.sql` (idempotent).

| Table | Key columns | Relations | Notes |
| --- | --- | --- | --- |
| `trips` | id, user_id, title, destination, start_date, end_date, currency, home_currency, fx_rate, budget_total, travellers | user_id → auth.users | `end_date ≥ start_date` check |
| `days` | id, trip_id, date, title, travel_mode, sort | trip_id → trips (cascade) | travel_mode ∈ WALKING / DRIVING / TRANSIT / BICYCLING |
| `stops` | id, trip_id, day_id, name, kind, lat, lng, place_id, address, start_time, end_time, note, cost, sort, source, booking_id | day_id → days (set null); booking_id → bookings (cascade) | kind ∈ sight / food / hotel / flight / transport / shop / activity / other; source ∈ manual / ai / booking |
| `bookings` | id, trip_id, type, title, file_path, provider, reference, start_at, end_at, from_name, to_name, from_lat/lng, to_lat/lng, cost, currency, parsed (jsonb) | trip_id → trips (cascade) | type ∈ flight / hotel / train / car / ticket / other |
| `expenses` | id, trip_id, day_id, category, title, amount, planned | trip_id → trips; day_id → days (set null) | category ∈ lodging / transport / food / activity / shopping / flight / other; planned=true is a budget line |

**RLS.** `trips`: `user_id = auth.uid()`. Child tables: `owns_trip(trip_id)` for USING and WITH CHECK (`security definer` SQL function).

**Storage.** Bucket `bookings` (private, 15 MB, PDF/PNG/JPEG/WEBP/HEIC). Path `<user_id>/<trip_id>/<timestamp>-<filename>`; policy requires first folder = `auth.uid()`. Files read through 1-hour signed URLs.

**Derived values (client-side).** Day cost = Σ stop.cost; planned = Σ expenses(planned) + Σ stop.cost; actual = Σ expenses(actual); per-person home = max(planned, actual) × fx_rate ÷ travellers.

## 6. APIs & Edge Functions

Both functions require a signed-in user (JWT verified against `/auth/v1/user`), answer CORS preflight, return `{ error }` with HTTP 400 on failure.

**`ai-recommend`** — POST via `supabase.functions.invoke('ai-recommend', { body })`.

| Field | Type | Meaning |
| --- | --- | --- |
| `query` | string (required) | the user's request |
| `trip` | { title, destination, start_date, end_date, travellers, currency } | trip context |
| `day` | { date, title, travel_mode } or null | the selected day |
| `stops` | [{ name, kind, lat, lng, start_time }] | stops already on that day |
| `all_stops` | string[] | names already in the trip (do-not-repeat) |

Response `{ suggestions: [{ name, kind, lat, lng, reason, reason_th?, est_cost?, best_time? }] }`. Model `ANTHROPIC_MODEL` or `claude-sonnet-4-5`; 2,500 output tokens.

**`parse-booking`** — POST.

| Field | Type | Meaning |
| --- | --- | --- |
| `filename` | string | detect PDF, shown to the model |
| `mime` | string | `application/pdf` or image type |
| `data` | string | base64 body (PDF → document block, image → image block) |
| `trip` | { destination, start_date, end_date, currency } | resolves years/currency |

Response `{ booking: { type, title, provider, reference, start_at, end_at, from_name, to_name, from_lat, from_lng, to_lat, to_lng, cost, currency, summary } }`.

**Secrets.** `ANTHROPIC_API_KEY` (required), `ANTHROPIC_MODEL` (optional) via `supabase secrets set`.

**Limits.** Edge Function timeout 150 s; uploads 15 MB; Directions 25 waypoints → max 27 pinned stops per routed day.

## 7. Map & route playback

`components/RouteMap.tsx` on the Google Maps JS API (`places`, `geometry`, `marker`). Browser key must enable Maps JavaScript, Places, Directions, Geocoding; restrict referrers to the Pages domain and localhost.

- **Route.** Stops with lat/lng → `DirectionsService.route` (origin, ≤25 waypoints, destination, day's travel mode). Custom numbered pins; other days' pins at 35% opacity. Fallback: dashed straight polyline + notice.
- **Animation.** Route flattened to a dense `LatLng[]`; cumulative distances precomputed; position at progress f = spherical interpolation inside the segment containing f × total. Heading flips the walker/bike SVG or rotates the car. `requestAnimationFrame` advances f by `dt × speed / 20 s`. Map pans only when the marker leaves the bounds.
- **Controls.** Play/pause, restart, scrub (0–1, step 0.001), speed 0.5/1/2/4×, readout "elapsed / total min". Any change to stops, day or mode stops playback and rebuilds.
- **Pinning.** Places Autocomplete (bounded to the map) and map click (reverse-geocoded) both call `onPickLocation`.
- **Quotas.** Directions billed per request → debounced rebuild planned (MAP-7). Autocomplete billed per session.

## 8. Booking parsing & auto-pin

| Booking type | Stops created | Day placement | Sort |
| --- | --- | --- | --- |
| flight | "✈ Depart <from>", "✈ Arrive <to>" | depart on start_at date, arrive on end_at date | −100 / −99 (first of day) |
| hotel | "(check-in)", one per further night, "(check-out)" | nights = check-in up to (excl.) check-out; check-out on its own day | nights 1000 (last), check-out −100 (first) |
| train / car / ticket / other | "<title> · from", "<title> · to" when coordinates exist | start_at date | appended |

Every created stop has `source = 'booking'` and `booking_id`; deleting the booking cascades them. A booking with a cost adds one planned expense (flight → flight, hotel → lodging, else transport). Nothing is written until the user confirms the preview.

## 9. UX / UI

Three directions were mocked (canvas: https://claude.ai/artifact/LxQbzYAjcUY6bjRm9knuvq; standalone copies in `docs/design/`). **Chosen: A · Trailhead** — implemented with Tailwind.

| | A · Trailhead (chosen) | B · Nightline | C · Paper Trail |
| --- | --- | --- | --- |
| Mood | Warm editorial, outdoor magazine | Dark map console, playback-first | Swiss grid, stationery |
| Ground / text | Cream #F5F1E8 / #1B1F1C | #0B0F14 / #E8EDF2 | White / #111111 |
| Accents | Forest #1F4D3A, clay #C4552D | Cyan #3DDCFF, amber #FFB020 | Cobalt #2449FF |
| Type | Fraunces + Manrope | Space Grotesk + JetBrains Mono | Archivo + Noto Sans Thai |
| Trip layout | Day rail · map · itinerary | Day strip · map dominant · narrow itinerary | Itinerary left · map right |

**Screens.** Portal `/` · Login/Sign up · My trips `/trips` · Trip `/trip?id=` with tabs Plan & map (#plan), AI suggest (#ai), Bookings (#bookings), Budget (#budget).

**Tailwind tokens** live in `tailwind.config.ts` (`ground, paper, line, sand, ink, muted, forest.*, clay.*`, `font-display`/`font-sans`, `rounded-card/-pill`, `shadow-card`). Primitives in `app/globals.css` (`btn`, `btn-primary`, `btn-outline`, `card`, `input`, `tabs`, `stop`, `timebox`, `player`, `badge-ai/-booking`, `dropzone`). Icons in `components/icons.tsx`.

**Responsive.** ≥1280 px three columns (rail 200 · map · itinerary); 1024–1279 rail + map, itinerary below; <1024 single column with the day rail as a horizontal scroller; map 560 px → 380 px on phones; player controls wrap.

**Bilingual.** English primary; Thai as a muted secondary line (`.th`) under headings and in AI `reason_th`.

**Accessibility.** Real buttons/labels, 44 px targets, `aria-label` on icon buttons, focus ring, 4.5:1 text contrast.

## 10. Security, privacy & keys

| Key | Lives in | Never in |
| --- | --- | --- |
| Supabase publishable (`sb_publishable_…`) | `.env.local`, GitHub secret `NEXT_PUBLIC_SUPABASE_ANON_KEY`, static JS | — |
| Supabase secret / service_role | nowhere in GoVibe | repo, `.env*`, GitHub secrets, chat |
| Google Maps browser key | `.env.local`, GitHub secret `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | unrestricted |
| Anthropic API key | `supabase secrets set ANTHROPIC_API_KEY` | repo, browser, GitHub secrets |

- RLS on all tables; `owns_trip()` is `security definer` with `search_path = public`.
- Storage policy ties path prefix to `auth.uid()`; signed URLs only.
- Edge Functions verify JWT; `verify_jwt = true` in `supabase/config.toml`.
- `.gitignore` excludes `.env`, `.env.local`, `.env*.local`.

**To do:** rotate the Supabase secret key that was pasted in chat; restrict the Maps key to `https://kittipeach.github.io/*` and `http://localhost:3000/*`; keep email confirmation on in production.

## 11. Deployment & environments

| Environment | Where | Config |
| --- | --- | --- |
| Local dev | `~/Documents/GoVibe`, `npm run dev` :3000 | `.env.local`; `basePath` empty |
| Production | GitHub Pages via Actions, `GITHUB_PAGES=true` | `basePath=/govibe`, `trailingSlash`, `output: 'export'`, `.nojekyll` |
| Backend | Supabase project `fkrqjpowuykzdnxypsqs` | schema.sql, bucket `bookings`, two Edge Functions |

GitHub secrets: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (set), `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (to add). Secrets are baked at build time → re-run the workflow after changing one.

Supabase checklist: run `supabase/schema.sql` · Email provider on (confirm off while testing) · Site URL + localhost redirect · `supabase link` · `supabase secrets set ANTHROPIC_API_KEY` · `supabase functions deploy ai-recommend` / `parse-booking`.

## 12. Roadmap & open questions

- **Phase 1 — UI (in progress):** Trailhead with Tailwind ✅; then DnD reorder (ITN-6), AI ghost pins (AI-3), keyboard playback (MAP-5), editable booking preview (BK-5), daily burn chart (BUD-5).
- **Phase 2 — Trip data:** edit dates (TRIP-3), duplicate (TRIP-4), debounced routing (MAP-7), delete storage object with booking (BK-7), multi-segment tickets (BK-6), photo albums per stop.
- **Phase 3 — Share & offline:** read-only link, export to single-file HTML planner, CSV (BUD-6), PWA, password reset (AUTH-4).

Open: `/trip?id=` vs `/trip/[id]`; Maps billing cap; stop cost per person vs per group; live FX on trip creation.
