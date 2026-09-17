-- Security lint fix: function_search_path_mutable. Pin search_path so the
-- trigger function can't be hijacked by a session-level search_path change.
CREATE OR REPLACE FUNCTION public.enforce_onboarding_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.role() = 'authenticated'
     AND NEW.onboarding_completed = true AND OLD.onboarding_completed = false THEN
    IF NULLIF(trim(NEW.father_name), '') IS NULL
       OR NEW.dob IS NULL
       OR NULLIF(trim(NEW.class_level), '') IS NULL
       OR NULLIF(trim(NEW.target_exam), '') IS NULL
       OR NULLIF(trim(NEW.city), '') IS NULL
       OR NULLIF(trim(NEW.state), '') IS NULL
    THEN
      RAISE EXCEPTION 'Cannot complete onboarding with missing required fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
