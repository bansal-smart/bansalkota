-- Multi-Centre / HQ restructure — Phase 1, step 6: suspension + course-access helpers.
-- Security-definer helpers used by login edge functions, AuthContext, and (optionally)
-- RLS to enforce centre suspension and course validity.

-- True if the user belongs (as student via profile, or as staff) to any suspended
-- centre. Used to block login on all paths and to kick live sessions.
CREATE OR REPLACE FUNCTION public.is_centre_suspended_for_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.centres c ON c.id = p.centre_id
    WHERE p.user_id = _user_id AND c.is_suspended
  ) OR EXISTS (
    SELECT 1 FROM public.centre_staff s
    JOIN public.centres c ON c.id = s.centre_id
    WHERE s.user_id = _user_id AND c.is_suspended
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_centre_suspended_for_user(uuid) TO authenticated, service_role;

-- True if the user has live access to a course: an active, non-expired enrollment.
-- Course validity = courses.end_date, copied to enrollments.expires_at at enroll time.
CREATE OR REPLACE FUNCTION public.has_course_access(_user_id uuid, _course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.user_id = _user_id
      AND e.course_id = _course_id
      AND e.is_active
      AND (e.expires_at IS NULL OR e.expires_at > now())
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_course_access(uuid, uuid) TO authenticated, service_role;
