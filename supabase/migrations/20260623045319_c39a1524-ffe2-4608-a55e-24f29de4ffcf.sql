
-- Hide test answer-key columns from direct Data API reads.
REVOKE SELECT (correct_answer, numerical_answer, explanation, answer_range_min, answer_range_max, tolerance)
  ON public.test_questions FROM anon, authenticated;

-- Hide chapter quiz answer-key columns from direct Data API reads.
REVOKE SELECT (correct_index, explanation)
  ON public.chapter_quiz_questions FROM anon, authenticated;

-- Hide live class join URLs from direct Data API reads (use get_live_class_join_url RPC).
REVOKE SELECT (meeting_url, recording_url)
  ON public.live_classes FROM anon, authenticated;

-- Allow students to read their own payment rows.
CREATE POLICY "Users can view their own payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.payments TO authenticated;
