import { supabase } from "@/integrations/supabase/client";

export const syncTestStats = async (testId: string) => {
  const { data, error } = await supabase
    .from("test_questions")
    .select("id, marks_correct, subject")
    .eq("test_id", testId);

  if (error) throw error;

  const rows = data ?? [];
  const subjects = Array.from(
    new Set(rows.map((q) => q.subject).filter((s): s is string => Boolean(s))),
  );

  const { error: updateError } = await supabase
    .from("tests")
    .update({
      total_questions: rows.length,
      total_marks: rows.reduce((sum, q) => sum + Number(q.marks_correct ?? 0), 0),
      subjects,
    })
    .eq("id", testId);

  if (updateError) throw updateError;

  return { totalQuestions: rows.length, totalMarks: rows.reduce((sum, q) => sum + Number(q.marks_correct ?? 0), 0), subjects };
};