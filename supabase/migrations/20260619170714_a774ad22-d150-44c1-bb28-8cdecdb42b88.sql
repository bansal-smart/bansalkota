-- 1. test_questions: hide answer key columns from anon/authenticated
REVOKE SELECT (correct_answer, numerical_answer, explanation, solution_image_url)
  ON public.test_questions FROM anon, authenticated;

-- 2. chapter_quiz_questions: hide answer key columns from anon/authenticated
REVOKE SELECT (correct_index, explanation)
  ON public.chapter_quiz_questions FROM anon, authenticated;

-- 3. schools: hide contact PII from regular authenticated users
REVOKE SELECT (contact_person, contact_email, contact_phone)
  ON public.schools FROM anon, authenticated;

-- Admin-only RPC to fetch school contact details
CREATE OR REPLACE FUNCTION public.admin_get_school_contacts(_school_ids uuid[] DEFAULT NULL)
RETURNS TABLE (id uuid, contact_person text, contact_email text, contact_phone text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_or_super(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  SELECT s.id, s.contact_person, s.contact_email, s.contact_phone
  FROM public.schools s
  WHERE _school_ids IS NULL OR s.id = ANY(_school_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_school_contacts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_school_contacts(uuid[]) TO authenticated;