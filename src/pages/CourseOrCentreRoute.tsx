import { useParams, Navigate } from "react-router-dom";
import { useCenters } from "@/hooks/useCenters";
import CoursesPage from "@/pages/CoursesPage";
import CourseDetailPage from "@/pages/CourseDetailPage";

// Old/misspelled course slugs that are indexed or bookmarked externally.
// The DB row's slug has been corrected (see the corresponding migration);
// this keeps old links alive with a client-side redirect. Note this is a
// 200+JS redirect, not a true HTTP 301 — Google generally follows it and
// consolidates ranking signals, but a server/CDN-level 301 is still the more
// robust fix if this host ever supports one (see SEO follow-ups doc).
const LEGACY_SLUG_REDIRECTS: Record<string, string> = {
  "nuclues-jee": "nucleus-jee",
};

// /courses/:slug is one dynamic segment shared by two different meanings:
// a course's own slug (CourseDetailPage) or a centre's slug (CoursesPage,
// filtered to that centre — /courses/akola). They can't be two separate
// routes since both are the exact same path shape and would collide.
// Centre slugs are known statically (useCenters' FALLBACK list — same data
// CenterDetailPage already trusts for slug lookups before the DB list
// loads), so this can resolve synchronously with no loading state.
const CourseOrCentreRoute = () => {
  const { slug } = useParams<{ slug: string }>();
  const { centers } = useCenters();
  if (slug && LEGACY_SLUG_REDIRECTS[slug]) {
    return <Navigate to={`/courses/${LEGACY_SLUG_REDIRECTS[slug]}`} replace />;
  }
  const isCentre = !!slug && centers.some((c) => c.slug === slug);
  return isCentre ? <CoursesPage centreSlugOverride={slug} /> : <CourseDetailPage />;
};

export default CourseOrCentreRoute;
