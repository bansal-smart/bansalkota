
-- Bulk resume all attempts for the two live tests so every student can continue
UPDATE public.test_attempts
SET status = 'in_progress',
    score = NULL,
    correct_answers = NULL,
    percentile = NULL,
    submitted_at = NULL,
    started_at = now(),
    time_override_minutes = 120,
    time_override_started_at = now(),
    reopened_reason = 'Bulk resume — auto-submit/logout incident'
WHERE test_id IN (
  '52740a13-f5c3-4ad9-96ac-229711c91c88',
  'd5e8b342-3b89-4b9f-8e6f-eacd3503e806'
);

-- Approve a re-attempt record for everyone so they don't get blocked re-entering
INSERT INTO public.test_reattempt_requests (user_id, test_id, attempt_id, reason, status, decided_at)
SELECT user_id, test_id, id, 'Bulk resume — admin', 'approved', now()
FROM public.test_attempts
WHERE test_id IN (
  '52740a13-f5c3-4ad9-96ac-229711c91c88',
  'd5e8b342-3b89-4b9f-8e6f-eacd3503e806'
);
