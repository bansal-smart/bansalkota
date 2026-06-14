
-- 1) Clear single-device session locks for every CBT kiosk student
DELETE FROM public.active_sessions s
USING auth.users u
WHERE s.user_id = u.id
  AND u.email LIKE '%@cbt.bansal.local';

-- 2) Replace literal "None"/"nan"/"NaN"/"null" phones on profiles with NULL
UPDATE public.profiles
SET phone = NULL
WHERE phone IN ('None','none','nan','NaN','null','NULL');
