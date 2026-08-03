-- Centre admins/staff could not see any rows on the Test Platform "Attempts" tab
-- because test_attempts only granted SELECT to admin/super_admin or the
-- attempting student themselves. Add centre-scoped visibility: staff with
-- test_platform view permission at a student's centre can see that student's
-- attempts, mirroring the existing "Centre staff view their students" policy
-- on profiles.
create policy "Centre staff view attempts of their students"
on public.test_attempts
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = test_attempts.user_id
      and p.centre_id is not null
      and public.has_permission(auth.uid(), 'test_platform', 'view', p.centre_id)
  )
);
