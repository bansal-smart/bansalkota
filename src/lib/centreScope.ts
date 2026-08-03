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
 * `includeGlobal` keeps rows with a NULL centre_id — HQ-authored content that
 * every centre is meant to share (mirrors the "Centre staff view global tests"
 * policy). Pass false for lists where global rows would be noise.
 */
export function scopeQueryToCentre<Q extends { or: (filter: string) => Q }>(
  query: Q,
  centreId: string | null,
  { includeGlobal = true }: { includeGlobal?: boolean } = {},
): Q {
  if (!centreId) return query;
  return query.or(
    includeGlobal ? `centre_id.eq.${centreId},centre_id.is.null` : `centre_id.eq.${centreId}`,
  );
}
