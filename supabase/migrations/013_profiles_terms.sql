-- Profile row per user for legal acceptance (separate from Stripe subscriptions).

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  accepted_terms boolean not null default false,
  accepted_terms_at timestamptz null
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Ensure every auth user has a profile row (default accepted_terms = false).
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (NEW.id)
  on conflict (user_id) do nothing;
  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user_profile();

-- Backfill profiles for users created before this migration.
insert into public.profiles (user_id, accepted_terms, accepted_terms_at)
select id, false, null
from auth.users
on conflict (user_id) do nothing;
