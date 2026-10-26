-- Public photos for listings (rooms, items). Anyone can view; only staff upload or delete.
-- Run in Supabase → SQL Editor after 0004.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy listing_photos_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and public.is_staff());
create policy listing_photos_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and public.is_staff());
