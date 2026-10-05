-- 1) Centre-student profile validation ran on every UPDATE, so unrelated writes
--    (phone sync, avatar, verification flags) to an incomplete legacy profile were
--    rejected. Validate on INSERT and only when a checked field changes.
CREATE OR REPLACE FUNCTION public.enforce_complete_centre_student_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND ROW(
       NEW.is_bansal_offline_student, NEW.onboarding_completed, NEW.full_name, NEW.father_name,
       NEW.dob, NEW.target_exam, NEW.class_level, NEW.centre_id, NEW.phone, NEW.roll_number
     ) IS NOT DISTINCT FROM ROW(
       OLD.is_bansal_offline_student, OLD.onboarding_completed, OLD.full_name, OLD.father_name,
       OLD.dob, OLD.target_exam, OLD.class_level, OLD.centre_id, OLD.phone, OLD.roll_number
     ) THEN
    RETURN NEW;
  END IF;

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
$function$;

-- 2) A question that students have attempted must not be hard-deleted: their
--    answers reference its id. Edit in place, or add new questions instead.
CREATE OR REPLACE FUNCTION public.block_delete_of_attempted_question()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.tests t WHERE t.id = OLD.test_id)
     AND EXISTS (SELECT 1 FROM public.test_attempts a WHERE a.test_id = OLD.test_id) THEN
    RAISE EXCEPTION
      'This test already has student attempts. Its questions can be edited in place or added to, but not deleted or replaced.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS block_delete_of_attempted_question ON public.test_questions;
CREATE TRIGGER block_delete_of_attempted_question
  BEFORE DELETE ON public.test_questions
  FOR EACH ROW EXECUTE FUNCTION public.block_delete_of_attempted_question();
