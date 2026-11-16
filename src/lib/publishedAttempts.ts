import { supabase } from "@/integrations/supabase/client";

/**
 * Reporting rule: an attempt counts toward a student's analysis only if its test
 * STILL EXISTS and IS PUBLISHED. Drafts/unpublished tests, deleted tests (their attempts
 * linger because test_attempts.test_id has no foreign key) and legacy attempts with no
 * test_id are all excluded.
 */
export function keepPublishedAttempts<T extends { test_id?: string | null }>(
  attempts: T[],
  publishedTestIds: ReadonlySet<string>,
): T[] {
  return attempts.filter((a) => !!a.test_id && publishedTestIds.has(a.test_id));
}

const CHUNK = 500; // sent in the POST body (no URL-length limit); the SQL function caps at 1000

/**
 * Of the given test ids, returns the ones whose test exists and is published.
 * Uses the published_test_ids() database function, which does NOT depend on the caller's
 * visibility of the test (a centre-staff user can only read some tests directly, and a
 * published test they cannot read must not make a student's attempt vanish from the report).
 * Throws on error so callers never silently report on unverified data.
 */
export async function fetchPublishedTestIds(testIds: Array<string | null | undefined>): Promise<Set<string>> {
  const ids = Array.from(new Set(testIds.filter((id): id is string => !!id)));
  const published = new Set<string>();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await supabase.rpc("published_test_ids", { _test_ids: ids.slice(i, i + CHUNK) });
    if (error) throw error;
    (data ?? []).forEach((r) => published.add(r.id));
  }
  return published;
}

/** Convenience: fetch publication status and filter in one go. */
export async function onlyPublishedAttempts<T extends { test_id?: string | null }>(attempts: T[]): Promise<T[]> {
  if (attempts.length === 0) return attempts;
  const ids = await fetchPublishedTestIds(attempts.map((a) => a.test_id));
  return keepPublishedAttempts(attempts, ids);
}
