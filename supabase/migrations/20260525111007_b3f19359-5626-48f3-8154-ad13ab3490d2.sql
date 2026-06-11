insert into storage.buckets (id, name, public)
values ('plant-images', 'plant-images', true)
on conflict (id) do nothing;

create policy "Public read plant-images"
on storage.objects for select
using (bucket_id = 'plant-images');

create policy "Public upload plant-images"
on storage.objects for insert
with check (bucket_id = 'plant-images');

create policy "Public update plant-images"
on storage.objects for update
using (bucket_id = 'plant-images');

create policy "Public delete plant-images"
on storage.objects for delete
using (bucket_id = 'plant-images');