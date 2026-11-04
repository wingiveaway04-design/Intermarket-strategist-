-- Trade setup image storage. Private journal screenshots remain owner-only;
-- official trade screenshots are served from a public bucket and only admins upload.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('trade-journal','trade-journal',false,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('public-trade-images','public-trade-images',true,8388608,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "Users upload own journal images" on storage.objects;
create policy "Users upload own journal images" on storage.objects for insert to authenticated
with check (bucket_id='trade-journal' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Users read own journal images" on storage.objects;
create policy "Users read own journal images" on storage.objects for select to authenticated
using (bucket_id='trade-journal' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Users delete own journal images" on storage.objects;
create policy "Users delete own journal images" on storage.objects for delete to authenticated
using (bucket_id='trade-journal' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists "Admins upload official trade images" on storage.objects;
create policy "Admins upload official trade images" on storage.objects for insert to authenticated
with check (bucket_id='public-trade-images' and public.is_admin());
drop policy if exists "Admins update official trade images" on storage.objects;
create policy "Admins update official trade images" on storage.objects for update to authenticated
using (bucket_id='public-trade-images' and public.is_admin())
with check (bucket_id='public-trade-images' and public.is_admin());
drop policy if exists "Admins delete official trade images" on storage.objects;
create policy "Admins delete official trade images" on storage.objects for delete to authenticated
using (bucket_id='public-trade-images' and public.is_admin());
