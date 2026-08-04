-- Syllabus & Sample Paper grid shown on the public BOOST page, managed from
-- the Super Admin BOOST Registrations panel (AdminBoostPage). Each row is a
-- class/stream; each of the two PDF slots is optional until an admin uploads
-- one. Mirrors the boost_settings RLS shape (public read, admin write) since
-- it's rendered on the same admin page and same public page.
create table public.boost_syllabus_resources (
  id uuid primary key default gen_random_uuid(),
  class_label text not null,
  sort_order integer not null default 0,
  sample_paper_path text,
  syllabus_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.boost_syllabus_resources enable row level security;

create policy "boost_syllabus_resources public read"
on public.boost_syllabus_resources
for select
using (true);

create policy "boost_syllabus_resources admin write"
on public.boost_syllabus_resources
for all
using (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

insert into public.boost_syllabus_resources (class_label, sort_order) values
  ('Class VI', 1),
  ('Class VII', 2),
  ('Class VIII', 3),
  ('Class IX', 4),
  ('Class X', 5),
  ('Class XI ENG', 6),
  ('Class XI MED', 7),
  ('Class XII ENG', 8),
  ('Class XII MED', 9),
  ('Class XIII ENG', 10),
  ('Class XIII MED', 11);

-- Public storage bucket for the uploaded PDFs; write restricted to admin/super_admin.
insert into storage.buckets (id, name, public)
values ('boost-syllabus', 'boost-syllabus', true)
on conflict (id) do nothing;

create policy "boost-syllabus public read"
on storage.objects
for select
using (bucket_id = 'boost-syllabus');

create policy "boost-syllabus admin write"
on storage.objects
for all
using (bucket_id = 'boost-syllabus' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)))
with check (bucket_id = 'boost-syllabus' AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));
