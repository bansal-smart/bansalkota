-- admin-create-center-user created auth users without ever inserting a
-- public.profiles row (no DB trigger mirrors user_metadata into profiles).
-- This left every such account (mostly centre-admin logins) with no name,
-- so Role Management fell back to showing a raw user-id fragment instead of
-- the name given at creation time. Backfill from the metadata that's already
-- sitting on auth.users for any account missing a profile.
insert into public.profiles (user_id, full_name, phone)
select
  u.id,
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), ''),
  u.raw_user_meta_data ->> 'phone'
from auth.users u
left join public.profiles p on p.user_id = u.id
where p.user_id is null
on conflict (user_id) do nothing;
