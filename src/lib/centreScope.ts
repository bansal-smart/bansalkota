/**
 * Restricts an admin *list* query to the signed-in centre admin's own centre.
 *
 * Why this is needed even though RLS exists: the centre-scoped tables
 * (courses, tests, course_batches, test_series, centre_carousel_banners) all
 * carry a deliberately permissive public-read policy — `is_published = true`
 * or `is_active = true` — so the public website can render the catalogue.
 * Postgres OR-combines permissive policies, so those public-read policies also
 * match for a logged-in centre admin. RLS therefore cannot be the thing that
 * scopes an admin list to one centre; the query has to say so explicitly.
 *
 * `includeGlobal` keeps rows with a NULL centre_id — content with no owning
 * centre (e.g. PAN-India `course_batches`, which are never assigned a
 * centre_id at all).
 *
 * `globalFlagColumn` is for `courses` / `tests` / `test_series`, which per
 * ADR 0001 use a *different* mechanism for HQ-wide content: every row has a
 * real owning `centre_id` (backfilled to Kota), and reach is controlled by a
 * separate `is_global` boolean instead of a NULL centre_id. Pass
 * `"is_global"` for those tables or `centre_id.is.null` will never match and
 * franchise centres will see zero HQ/global rows. Mirrors the pattern already
 * used for the public course catalogue (see `useCourses.ts`).
 */
export function scopeQueryToCentre<Q extends { or: (filter: string) => Q }>(
  query: Q,
  centreId: string | null,
  { includeGlobal = true, globalFlagColumn }: { includeGlobal?: boolean; globalFlagColumn?: string } = {},
): Q {
  if (!centreId) return query;
  if (!includeGlobal) return query.or(`centre_id.eq.${centreId}`);
  const clauses = [`centre_id.eq.${centreId}`, `centre_id.is.null`];
  if (globalFlagColumn) clauses.push(`${globalFlagColumn}.eq.true`);
  return query.or(clauses.join(","));
}
