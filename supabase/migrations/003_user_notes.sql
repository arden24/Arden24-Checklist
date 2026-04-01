-- Run this in Supabase Dashboard: SQL Editor → New query → paste and Run.
-- Creates per-user notes stored in categories (weekly interest, watchlist, plan, lessons, general).

create table if not exists public.user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_notes_user_id_category_idx
  on public.user_notes(user_id, category);

alter table public.user_notes enable row level security;

drop policy if exists "Users can read own notes" on public.user_notes;
create policy "Users can read own notes"
  on public.user_notes
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can upsert own notes" on public.user_notes;
create policy "Users can upsert own notes"
  on public.user_notes
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own notes" on public.user_notes;
create policy "Users can update own notes"
  on public.user_notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own notes" on public.user_notes;
create policy "Users can delete own notes"
  on public.user_notes
  for delete
  using (auth.uid() = user_id);

