create extension if not exists "pgcrypto";
create table if not exists public.attendees (
  id uuid primary key default gen_random_uuid(),
  zeffy_payment_id text not null unique,
  zeffy_event_id text unique,
  email text,
  full_name text,
  ticket_type text,
  amount_cents integer,
  currency text,
  status text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists attendees_paid_at_idx on public.attendees (paid_at desc);
create index if not exists attendees_ticket_type_idx on public.attendees (ticket_type);

-- Internal data is accessible through the server service role only.
-- No anon/authenticated policies: the service role bypasses RLS.
alter table public.attendees enable row level security;
