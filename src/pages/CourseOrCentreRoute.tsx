import { useParams } from "react-router-dom";
import { useCenters } from "@/hooks/useCenters";
import CoursesPage from "@/pages/CoursesPage";
import CourseDetailPage from "@/pages/CourseDetailPage";

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
  const isCentre = !!slug && centers.some((c) => c.slug === slug);
  return isCentre ? <CoursesPage centreSlugOverride={slug} /> : <CourseDetailPage />;
};

export default CourseOrCentreRoute;
