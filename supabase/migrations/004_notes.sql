-- Run in Supabase SQL Editor if you use the `notes` table (matches app default).
-- Idempotent: safe to run when the table already exists.

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Required for one row per user per category (and for safe concurrent saves)
create unique index if not exists notes_user_id_category_idx
  on public.notes(user_id, category);

create index if not exists notes_user_id_idx on public.notes(user_id);

alter table public.notes enable row level security;

-- Policies (skip errors if you already created these — adjust names if duplicate)
drop policy if exists "Users can read own notes rows" on public.notes;
drop policy if exists "Users can insert own notes rows" on public.notes;
drop policy if exists "Users can update own notes rows" on public.notes;
drop policy if exists "Users can delete own notes rows" on public.notes;

create policy "Users can read own notes rows"
  on public.notes
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own notes rows"
  on public.notes
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notes rows"
  on public.notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own notes rows"
  on public.notes
  for delete
  using (auth.uid() = user_id);
