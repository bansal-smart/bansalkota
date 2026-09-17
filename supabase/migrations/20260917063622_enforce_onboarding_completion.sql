-- Server-side guard so a profile can't be marked onboarding_completed = true
-- (self-signup's "profile complete" gate) with required personal/academic
-- fields missing, even if the client-side dialog/validation is bypassed by
-- calling the API directly. Only fires on the false -> true transition, so
-- existing rows already marked complete (or never completed) are untouched.
--
-- Scoped to auth.role() = 'authenticated' only — i.e. the student's own
-- browser session calling this table directly (ProfileCompletionDialog).
-- Admin-side paths (bulk-import, center-create-student, etc.) run as
-- service_role via their edge functions and legitimately set
-- onboarding_completed = true on intentionally partial rows (a centre
-- roster upload completed progressively) — those must NOT be blocked by
-- this guard, so service_role writes are exempt.
CREATE OR REPLACE FUNCTION public.enforce_onboarding_completion()
RETURNS trigger
LANGUAGE plpgsql
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

DROP TRIGGER IF EXISTS trg_enforce_onboarding_completion ON public.profiles;
CREATE TRIGGER trg_enforce_onboarding_completion
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_onboarding_completion();
