-- Run this in Supabase Dashboard: SQL Editor → New query → paste and Run.
-- Creates open_trades table with RLS so users only see their own open trades.

create table if not exists public.open_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pair text not null,
  market text not null,
  direction text,
  entry_price numeric,
  stop_loss numeric,
  take_profit numeric,
  lot_size text,
  notes text,
  date text,
  created_at timestamptz not null default now()
);

create index if not exists open_trades_user_id_idx on public.open_trades(user_id);

alter table public.open_trades enable row level security;

drop policy if exists "Users can do everything on own open_trades" on public.open_trades;

create policy "Users can do everything on own open_trades"
  on public.open_trades
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
