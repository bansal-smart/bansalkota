import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CourseRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  subject: string;
  educator_name: string;
  thumbnail_url: string | null;
  rating: number;
  total_lessons: number;
  duration_hours: number;
  badge: string | null;
  price: number;
  original_price: number | null;
  discount_percent: number | null;
  target_exam: string | null;
  is_published: boolean;
  total_enrolled: number | null;
  short_description: string | null;
  education_level: string | null;
  duration_label: string | null;
  mode: string | null;
  language: string | null;
  subjects_covered: string[] | null;
  description_html: string | null;
  included_services: string[] | null;
  // Resolved per the centre-offering price rule (see resolveCoursePrice below).
  // Always present — falls back to `price`/`original_price` when no offering applies.
  resolved_price: number;
  resolved_original_price: number | null;
  price_label: "fixed" | "starting_from";
  has_multiple_offerings: boolean;
};

const COURSE_COLUMNS =
  "id, slug, name, description, subject, educator_name, thumbnail_url, rating, total_lessons, duration_hours, badge, price, original_price, discount_percent, target_exam, is_published, total_enrolled, short_description, education_level, duration_label, mode, language, subjects_covered, description_html, included_services";

type OfferingLite = { course_id: string; centre_id: string; price: number; original_price: number | null };

/**
 * Price resolution rule (shared by course listing + detail pages):
 * 1. An active offering exists for the given centre context -> use its price.
 * 2. No centre context, but the course has active offering(s) elsewhere -> "starting from" the lowest.
 * 3. Otherwise -> the base course price (today's behavior, always available).
 */
export const resolveCoursePrice = (
  courseId: string,
  basePrice: number,
  baseOriginalPrice: number | null,
  offerings: OfferingLite[],
  centreId?: string | null,
): { resolved_price: number; resolved_original_price: number | null; price_label: "fixed" | "starting_from"; has_multiple_offerings: boolean } => {
  const own = offerings.filter((o) => o.course_id === courseId);
  if (centreId) {
    const match = own.find((o) => o.centre_id === centreId);
    if (match) return { resolved_price: match.price, resolved_original_price: match.original_price, price_label: "fixed", has_multiple_offerings: own.length > 1 };
    return { resolved_price: basePrice, resolved_original_price: baseOriginalPrice, price_label: "fixed", has_multiple_offerings: own.length > 1 };
  }
  if (own.length > 0) {
    const lowest = own.reduce((min, o) => (o.price < min.price ? o : min), own[0]);
    return { resolved_price: lowest.price, resolved_original_price: null, price_label: "starting_from", has_multiple_offerings: own.length > 1 };
  }
  return { resolved_price: basePrice, resolved_original_price: baseOriginalPrice, price_label: "fixed", has_multiple_offerings: false };
};

export const useCourses = (targetExam?: string, subject?: string, centreId?: string | null) => {
  const query = useQuery({
    queryKey: ["courses", { targetExam: targetExam ?? "All", subject: subject ?? "All", centreId: centreId ?? null }],
    queryFn: async () => {
      let q = supabase
        .from("courses")
        .select(COURSE_COLUMNS)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (targetExam && targetExam !== "All") q = q.eq("target_exam", targetExam);
      if (subject && subject !== "All") q = q.eq("subject", subject);
      if (centreId) q = q.or(`centre_id.eq.${centreId},is_global.eq.true`);
      const { data, error } = await q;
      if (error) throw error;
      const courses = (data ?? []) as Omit<CourseRow, "resolved_price" | "resolved_original_price" | "price_label" | "has_multiple_offerings">[];

      const courseIds = courses.map((c) => c.id);
      let offerings: OfferingLite[] = [];
      if (courseIds.length) {
        const { data: offeringRows } = await (supabase as any)
          .from("course_offerings")
          .select("course_id, centre_id, price, original_price")
          .in("course_id", courseIds)
          .eq("is_active", true);
        offerings = (offeringRows ?? []) as OfferingLite[];
      }

      return courses.map((c) => ({
        ...c,
        ...resolveCoursePrice(c.id, c.price, c.original_price, offerings, centreId),
      })) as CourseRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return { courses: query.data ?? [], loading: query.isPending };
};
