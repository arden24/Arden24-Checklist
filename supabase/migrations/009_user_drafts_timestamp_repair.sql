-- Repair schema drift for existing local/staging DBs where user_drafts
-- may exist without created_at / updated_at.
-- Additive + idempotent only (no destructive operations).

alter table if exists public.user_drafts
  add column if not exists created_at timestamptz;

alter table if exists public.user_drafts
  add column if not exists updated_at timestamptz;

update public.user_drafts
set
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where created_at is null or updated_at is null;

alter table if exists public.user_drafts
  alter column created_at set default now();

alter table if exists public.user_drafts
  alter column updated_at set default now();

alter table if exists public.user_drafts
  alter column created_at set not null;

alter table if exists public.user_drafts
  alter column updated_at set not null;
