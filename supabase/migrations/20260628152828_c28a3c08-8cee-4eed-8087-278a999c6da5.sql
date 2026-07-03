drop policy if exists "admins manage test-solutions" on storage.objects;
create policy "admins manage test-solutions"
on storage.objects for all
to authenticated
using (
  bucket_id = 'test-solutions'
  and (public.has_role(auth.uid(), 'admin'::app_role) or public.has_role(auth.uid(), 'super_admin'::app_role))
)
with check (
  bucket_id = 'test-solutions'
  and (public.has_role(auth.uid(), 'admin'::app_role) or public.has_role(auth.uid(), 'super_admin'::app_role))
);

drop policy if exists "students read released test-solutions" on storage.objects;
create policy "students read released test-solutions"
on storage.objects for select
to authenticated
using (
  bucket_id = 'test-solutions'
  and exists (
    select 1 from public.tests t
    where t.id::text = split_part(storage.objects.name, '/', 1)
      and t.results_released_at is not null
      and t.results_released_at <= now()
  )
);