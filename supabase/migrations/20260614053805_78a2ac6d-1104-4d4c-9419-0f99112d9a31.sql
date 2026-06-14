CREATE TABLE IF NOT EXISTS public.test_attempt_answer_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  test_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  question_statuses jsonb NOT NULL DEFAULT '{}'::jsonb,
  answer_count integer NOT NULL DEFAULT 0,
  saved_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.test_attempt_answer_snapshots TO service_role;

ALTER TABLE public.test_attempt_answer_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can access answer snapshots"
ON public.test_attempt_answer_snapshots
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_test_attempt_answer_snapshots_attempt_saved
ON public.test_attempt_answer_snapshots (attempt_id, saved_at DESC);

CREATE OR REPLACE FUNCTION public._jsonb_answer_has_selection(_answer jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _answer IS NULL OR NOT (_answer ? 'selected') THEN false
    WHEN _answer -> 'selected' IS NULL OR _answer -> 'selected' = 'null'::jsonb THEN false
    WHEN jsonb_typeof(_answer -> 'selected') = 'array' THEN jsonb_array_length(_answer -> 'selected') > 0
    WHEN jsonb_typeof(_answer -> 'selected') = 'object' THEN (_answer -> 'selected') <> '{}'::jsonb
    WHEN jsonb_typeof(_answer -> 'selected') = 'string' THEN length(trim(both '"' from (_answer -> 'selected')::text)) > 0
    ELSE true
  END
$$;

CREATE OR REPLACE FUNCTION public.protect_test_attempt_answers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_key text;
  clear_ids text[] := ARRAY[]::text[];
  merged_answers jsonb;
  merged_statuses jsonb;
  old_answer_count integer := 0;
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD.answers IS NOT DISTINCT FROM NEW.answers THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO old_answer_count
  FROM jsonb_each(COALESCE(OLD.answers, '{}'::jsonb)) e
  WHERE public._jsonb_answer_has_selection(e.value);

  IF old_answer_count > 0 THEN
    INSERT INTO public.test_attempt_answer_snapshots (
      attempt_id, user_id, test_id, answers, question_statuses, answer_count
    ) VALUES (
      OLD.id,
      OLD.user_id,
      OLD.test_id,
      COALESCE(OLD.answers, '{}'::jsonb),
      COALESCE(OLD.question_statuses, '{}'::jsonb),
      old_answer_count
    );
  END IF;

  IF jsonb_typeof(COALESCE(NEW.metadata, '{}'::jsonb) -> 'explicit_clear_ids') = 'array' THEN
    SELECT COALESCE(array_agg(value), ARRAY[]::text[])
    INTO clear_ids
    FROM jsonb_array_elements_text(NEW.metadata -> 'explicit_clear_ids') AS value;
  END IF;

  merged_answers := COALESCE(NEW.answers, '{}'::jsonb);
  merged_statuses := COALESCE(NEW.question_statuses, '{}'::jsonb);

  FOR old_key IN SELECT jsonb_object_keys(COALESCE(OLD.answers, '{}'::jsonb)) LOOP
    IF old_key = ANY(clear_ids) THEN
      CONTINUE;
    END IF;

    IF public._jsonb_answer_has_selection(OLD.answers -> old_key)
       AND NOT public._jsonb_answer_has_selection(NEW.answers -> old_key) THEN
      merged_answers := jsonb_set(merged_answers, ARRAY[old_key], OLD.answers -> old_key, true);
      merged_statuses := jsonb_set(
        merged_statuses,
        ARRAY[old_key],
        to_jsonb(CASE
          WHEN COALESCE(OLD.question_statuses ->> old_key, '') IN ('marked', 'answered-marked') THEN 'answered-marked'
          ELSE 'answered'
        END),
        true
      );
    END IF;
  END LOOP;

  NEW.answers := merged_answers;
  NEW.question_statuses := merged_statuses;
  NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) - 'explicit_clear_ids';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_test_attempt_answers_trigger ON public.test_attempts;
CREATE TRIGGER protect_test_attempt_answers_trigger
BEFORE UPDATE OF answers, question_statuses ON public.test_attempts
FOR EACH ROW
EXECUTE FUNCTION public.protect_test_attempt_answers();