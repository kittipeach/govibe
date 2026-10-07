-- GoVibe schema — run in Supabase SQL editor (Dashboard → SQL → New query → paste → Run)
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE.

create extension if not exists pgcrypto;

-- ---------- tables ----------
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  destination text not null default '',
  start_date date not null,
  end_date date not null,
  currency text not null default 'JPY',
  home_currency text not null default 'THB',
  fx_rate numeric not null default 1,
  budget_total numeric,
  travellers int not null default 1,
  cover_url text,
  notes text,
  created_at timestamptz not null default now(),
  constraint trips_dates check (end_date >= start_date)
);

create table if not exists public.days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  date date not null,
  title text not null default '',
  travel_mode text not null default 'DRIVING' check (travel_mode in ('WALKING','DRIVING','TRANSIT','BICYCLING')),
  sort int not null default 0
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  type text not null check (type in ('flight','hotel','train','car','ticket','other')),
  title text not null,
  file_path text,
  provider text,
  reference text,
  start_at timestamptz,
  end_at timestamptz,
  from_name text, to_name text,
  from_lat double precision, from_lng double precision,
  to_lat double precision, to_lng double precision,
  cost numeric,
  currency text,
  parsed jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_id uuid references public.days(id) on delete set null,
  name text not null,
  kind text not null default 'sight' check (kind in ('sight','food','hotel','flight','transport','shop','activity','other')),
  lat double precision, lng double precision,
  place_id text,
  address text,
  start_time text, end_time text,
  note text,
  cost numeric,
  sort int not null default 0,
  source text not null default 'manual' check (source in ('manual','ai','booking')),
  booking_id uuid references public.bookings(id) on delete cascade
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_id uuid references public.days(id) on delete set null,
  category text not null check (category in ('lodging','transport','food','activity','shopping','flight','other')),
  title text not null,
  amount numeric not null default 0,
  planned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists trips_user_idx on public.trips(user_id);
create index if not exists days_trip_idx on public.days(trip_id, sort);
create index if not exists stops_trip_idx on public.stops(trip_id, day_id, sort);
create index if not exists bookings_trip_idx on public.bookings(trip_id);
create index if not exists expenses_trip_idx on public.expenses(trip_id);

-- ---------- RLS ----------
alter table public.trips    enable row level security;
alter table public.days     enable row level security;
alter table public.stops    enable row level security;
alter table public.bookings enable row level security;
alter table public.expenses enable row level security;

-- helper: does the current user own this trip?
create or replace function public.owns_trip(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trips where id = t and user_id = auth.uid());
$$;

drop policy if exists trips_owner on public.trips;
create policy trips_owner on public.trips
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists days_owner on public.days;
create policy days_owner on public.days
  for all using (public.owns_trip(trip_id)) with check (public.owns_trip(trip_id));

drop policy if exists stops_owner on public.stops;
create policy stops_owner on public.stops
  for all using (public.owns_trip(trip_id)) with check (public.owns_trip(trip_id));

drop policy if exists bookings_owner on public.bookings;
create policy bookings_owner on public.bookings
  for all using (public.owns_trip(trip_id)) with check (public.owns_trip(trip_id));

drop policy if exists expenses_owner on public.expenses;
create policy expenses_owner on public.expenses
  for all using (public.owns_trip(trip_id)) with check (public.owns_trip(trip_id));

-- ---------- storage: private bucket for uploaded tickets / confirmations ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bookings', 'bookings', false, 15728640, array['application/pdf','image/png','image/jpeg','image/webp','image/heic'])
on conflict (id) do nothing;

-- files are stored as  <user_id>/<trip_id>/<file>  — first folder must equal the caller's uid
drop policy if exists bookings_storage_rw on storage.objects;
create policy bookings_storage_rw on storage.objects
  for all using (bucket_id = 'bookings' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'bookings' and (storage.foldername(name))[1] = auth.uid()::text);
