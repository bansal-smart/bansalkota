import { supabase } from "@/integrations/supabase/client";

export const COMPLETED_TEST_STATUSES = ["submitted", "auto_submitted"] as const;

export type StudentAttemptGate = {
  canStartNew: boolean;
  completedAttemptId: string | null;
};

export function isAlreadyAttemptedError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  const msg = (error.message ?? "").toUpperCase();
  return msg.includes("ALREADY_ATTEMPTED");
}

export async function getStudentAttemptGate(userId: string, testId: string): Promise<StudentAttemptGate> {
  const { data: completedRows } = await supabase
    .from("test_attempts")
    .select("id")
    .eq("user_id", userId)
    .eq("test_id", testId)
    .in("status", [...COMPLETED_TEST_STATUSES])
    .order("submitted_at", { ascending: false })
    .limit(1);

  const completed = Array.isArray(completedRows) ? completedRows[0] : completedRows;
  if (!completed?.id) {
    return { canStartNew: true, completedAttemptId: null };
  }

  const { data: allowed } = await supabase.rpc("can_reattempt_test", {
    _user_id: userId,
    _test_id: testId,
  });

  return { canStartNew: !!allowed, completedAttemptId: completed.id };
}
