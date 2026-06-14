
-- 1) Reopen both tests
UPDATE public.tests
SET ends_at = now() + interval '4 hours',
    results_released_at = NULL,
    auto_release = false
WHERE id IN ('52740a13-f5c3-4ad9-96ac-229711c91c88','d5e8b342-3b89-4b9f-8e6f-eacd3503e806');

-- 2) Resume the 3 attempts with 15 min extra, preserving saved answers
UPDATE public.test_attempts
SET status = 'in_progress',
    score = NULL,
    correct_answers = NULL,
    percentile = NULL,
    submitted_at = NULL,
    started_at = now(),
    time_override_minutes = 15,
    time_override_started_at = now(),
    reopened_reason = 'Extra 15 min granted - resume with saved responses'
WHERE id IN (
  'd9f65eaf-24bb-40a5-a504-edd9408cd2ba',  -- 261036 ADARSH NAYAN (11th test)
  '96632fd0-ab41-4861-a382-48737aeac1a2',  -- 261028 ARSHI KHAN   (XIII test)
  '29db7b1a-60c0-4d1f-a9d7-afd20d043e19'   -- 261030 SUMIT KUMAR  (11th test)
);

-- Log the reattempt approvals so policy/UI flows treat these as authorised
INSERT INTO public.test_reattempt_requests (user_id, test_id, attempt_id, reason, status, decided_at)
SELECT ta.user_id, ta.test_id, ta.id,
       'Extra 15 min granted - resume with saved responses', 'approved', now()
FROM public.test_attempts ta
WHERE ta.id IN (
  'd9f65eaf-24bb-40a5-a504-edd9408cd2ba',
  '96632fd0-ab41-4861-a382-48737aeac1a2',
  '29db7b1a-60c0-4d1f-a9d7-afd20d043e19'
);
