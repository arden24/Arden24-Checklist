-- Ensure user_drafts supports upsert on (user_id, draft_key) everywhere.
-- Non-destructive dedupe strategy:
-- - Keep one canonical row per (user_id, draft_key) (most recently updated)
-- - Preserve additional rows by renaming draft_key with a legacy suffix
-- - Add unique index used by ON CONFLICT (user_id, draft_key)

with ranked as (
  select
    id,
    user_id,
    draft_key,
    row_number() over (
      partition by user_id, draft_key
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.user_drafts
),
dupes as (
  select id
  from ranked
  where rn > 1
)
update public.user_drafts d
set draft_key = d.draft_key || '__legacy_' || d.id::text
from dupes
where d.id = dupes.id;

create unique index if not exists user_drafts_user_id_draft_key_uidx
  on public.user_drafts(user_id, draft_key);
