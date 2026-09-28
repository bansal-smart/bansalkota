-- Keep staff/admin and intentionally incomplete self-signup profiles out of
-- scope. Centre-created profiles mark themselves as offline and completed, so
-- enforce their required fields on every INSERT/UPDATE without invalidating
-- historic rows that were already incomplete.
CREATE OR REPLACE FUNCTION public.enforce_complete_centre_student_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_bansal_offline_student IS TRUE
     AND NEW.onboarding_completed IS TRUE THEN
    IF NULLIF(trim(NEW.full_name), '') IS NULL
       OR NULLIF(trim(NEW.father_name), '') IS NULL
       OR NEW.dob IS NULL
       OR NULLIF(trim(NEW.target_exam), '') IS NULL
       OR NULLIF(trim(NEW.class_level), '') IS NULL
       OR NEW.centre_id IS NULL
       OR (
         NULLIF(trim(NEW.phone), '') IS NULL
         AND NULLIF(trim(NEW.roll_number), '') IS NULL
       )
    THEN
      RAISE EXCEPTION
        'Completed centre student profiles require name, father_name, dob, target_exam, class_level, centre_id, and phone or roll_number';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_complete_centre_student_profile ON public.profiles;
CREATE TRIGGER trg_enforce_complete_centre_student_profile
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_complete_centre_student_profile();
