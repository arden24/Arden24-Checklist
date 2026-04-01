-- Private storage bucket for strategy checklist screenshots.
-- Object path format: <user_id>/<uuid>-<filename>

insert into storage.buckets (id, name, public)
values ('checklist-images', 'checklist-images', false)
on conflict (id) do nothing;

drop policy if exists "Users can read own checklist images" on storage.objects;
drop policy if exists "Users can upload own checklist images" on storage.objects;
drop policy if exists "Users can update own checklist images" on storage.objects;
drop policy if exists "Users can delete own checklist images" on storage.objects;

create policy "Users can read own checklist images"
  on storage.objects
  for select
  using (
    bucket_id = 'checklist-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can upload own checklist images"
  on storage.objects
  for insert
  with check (
    bucket_id = 'checklist-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update own checklist images"
  on storage.objects
  for update
  using (
    bucket_id = 'checklist-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'checklist-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own checklist images"
  on storage.objects
  for delete
  using (
    bucket_id = 'checklist-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
