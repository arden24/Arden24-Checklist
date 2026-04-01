-- User-scoped drafts for cross-device continuity (strategies, checklist, etc).
-- One row per (user_id, draft_key). Payload is JSON.

create table if not exists public.user_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  draft_key text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint user_drafts_user_key unique (user_id, draft_key)
);

create index if not exists user_drafts_user_id_idx on public.user_drafts(user_id);
create index if not exists user_drafts_key_idx on public.user_drafts(draft_key);

alter table public.user_drafts enable row level security;

drop policy if exists "Users can select own user_drafts" on public.user_drafts;
drop policy if exists "Users can insert own user_drafts" on public.user_drafts;
drop policy if exists "Users can update own user_drafts" on public.user_drafts;
drop policy if exists "Users can delete own user_drafts" on public.user_drafts;

create policy "Users can select own user_drafts"
  on public.user_drafts
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own user_drafts"
  on public.user_drafts
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own user_drafts"
  on public.user_drafts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own user_drafts"
  on public.user_drafts
  for delete
  using (auth.uid() = user_id);
