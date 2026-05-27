
-- 1. lessons: revoke video_url from anon (logged-out visitors should never see paid video URLs)
REVOKE SELECT (video_url) ON public.lessons FROM anon;

-- 2. Realtime channel authorization
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated realtime topic access" ON realtime.messages;

CREATE POLICY "Authenticated realtime topic access"
ON realtime.messages FOR SELECT TO authenticated
USING (
  -- Own user channel (e.g. notifications, mentor-chat-{uid})
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
  -- Compete match channels the user is a participant in
  OR EXISTS (
    SELECT 1 FROM public.compete_matches m
    WHERE realtime.topic() LIKE '%' || m.id::text || '%'
      AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
  )
  -- Mentor group channels the user belongs to
  OR EXISTS (
    SELECT 1 FROM public.mentor_groups g
    WHERE realtime.topic() LIKE '%' || g.id::text || '%'
      AND (
        g.mentor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.mentor_group_members gm
          WHERE gm.group_id = g.id AND gm.student_id = auth.uid()
        )
      )
  )
  -- Admins / super_admins observe all channels
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);
