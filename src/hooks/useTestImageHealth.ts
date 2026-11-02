import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TestImageHealth {
  total: number;
  missing: number;
  brokenQuestions: number;
}

/**
 * Admin-side health check: how many of each test's question images no longer
 * exist in storage (see admin_check_test_images). Silent no-op if the RPC is
 * unavailable, so it can never block the admin screens.
 *
 * Returns the latest result per requested test id (tests with no image refs are
 * simply absent) and a `refetch` to call after re-importing questions.
 */
export function useTestImageHealth(testIds: string[]) {
  const [health, setHealth] = useState<Record<string, TestImageHealth>>({});
  const [nonce, setNonce] = useState(0);
  const key = useMemo(() => [...testIds].sort().join(","), [testIds]);
  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!key) { setHealth({}); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("admin_check_test_images", { _test_ids: key.split(",") });
      if (cancelled || error || !data) return;
      // Replace (don't merge): a re-import that left a test with no images must clear its old warning.
      const next: Record<string, TestImageHealth> = {};
      for (const r of data) {
        next[r.test_id] = { total: r.total_refs, missing: r.missing_refs, brokenQuestions: r.broken_questions };
      }
      setHealth(next);
    })();
    return () => { cancelled = true; };
  }, [key, nonce]);

  return { health, refetch };
}
