
WITH ranked AS (
  SELECT id, user_id, test_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, test_id
      ORDER BY
        CASE WHEN jsonb_typeof(answers)='object'
             THEN (SELECT count(*) FROM jsonb_object_keys(answers)) ELSE 0 END DESC,
        created_at DESC
    ) AS rn
  FROM public.test_attempts
  WHERE test_id IN (
    '52740a13-f5c3-4ad9-96ac-229711c91c88',
    'd5e8b342-3b89-4b9f-8e6f-eacd3503e806'
  )
)
DELETE FROM public.test_attempts
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

UPDATE public.test_attempts
SET status = 'in_progress',
    score = NULL,
    correct_answers = NULL,
    percentile = NULL,
    submitted_at = NULL,
    started_at = now(),
    time_override_minutes = 120,
    time_override_started_at = now(),
    reopened_reason = 'Bulk resume — kept best attempt with all answers'
WHERE test_id IN (
  '52740a13-f5c3-4ad9-96ac-229711c91c88',
  'd5e8b342-3b89-4b9f-8e6f-eacd3503e806'
);

-- Prevent future duplicates: one in_progress per (user, test)
CREATE UNIQUE INDEX IF NOT EXISTS test_attempts_one_in_progress_per_user_test
  ON public.test_attempts (user_id, test_id)
  WHERE status = 'in_progress';
