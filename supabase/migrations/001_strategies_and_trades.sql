-- Run this in Supabase Dashboard: SQL Editor → New query → paste and Run.
-- Creates strategies and trades tables with Row Level Security (RLS) so each user only sees their own data.

-- Strategies table
create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  market text default '',
  timeframes text default '',
  checklist jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists strategies_user_id_idx on public.strategies(user_id);

alter table public.strategies enable row level security;

drop policy if exists "Users can do everything on own strategies" on public.strategies;

create policy "Users can do everything on own strategies"
  on public.strategies
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trades table (journal / closed trades)
create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,
  pair text not null,
  market text not null,
  session text,
  direction text,
  pnl numeric not null default 0,
  rr text,
  description text,
  notes text,
  thoughts text,
  confidence numeric,
  strategy text,
  created_at timestamptz not null default now(),
  result text,
  currency text,
  time text,
  screenshot text,
  rating int
);

create index if not exists trades_user_id_idx on public.trades(user_id);
create index if not exists trades_date_idx on public.trades(date);

alter table public.trades enable row level security;

drop policy if exists "Users can do everything on own trades" on public.trades;

create policy "Users can do everything on own trades"
  on public.trades
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
