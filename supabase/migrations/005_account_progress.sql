-- Run in Supabase SQL Editor (or via migrations).
-- One row per user: funding / account progress tracker for the Journal page.

create table if not exists public.account_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_type text not null default 'challenge',
  starting_balance numeric not null default 0,
  current_balance numeric not null default 0,
  target_amount numeric not null default 0,
  target_label text not null default '',
  target_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_progress_user_id_key unique (user_id)
);

create index if not exists account_progress_user_id_idx on public.account_progress(user_id);

alter table public.account_progress enable row level security;

drop policy if exists "Users can select own account_progress" on public.account_progress;
drop policy if exists "Users can insert own account_progress" on public.account_progress;
drop policy if exists "Users can update own account_progress" on public.account_progress;
drop policy if exists "Users can delete own account_progress" on public.account_progress;

create policy "Users can select own account_progress"
  on public.account_progress
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own account_progress"
  on public.account_progress
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own account_progress"
  on public.account_progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own account_progress"
  on public.account_progress
  for delete
  using (auth.uid() = user_id);
