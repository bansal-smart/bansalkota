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
};

const COURSE_COLUMNS =
  "id, slug, name, description, subject, educator_name, thumbnail_url, rating, total_lessons, duration_hours, badge, price, original_price, discount_percent, target_exam, is_published, total_enrolled";

export const useCourses = (targetExam?: string, subject?: string) => {
  const query = useQuery({
    queryKey: ["courses", { targetExam: targetExam ?? "All", subject: subject ?? "All" }],
    queryFn: async () => {
      let q = supabase
        .from("courses")
        .select(COURSE_COLUMNS)
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (targetExam && targetExam !== "All") q = q.eq("target_exam", targetExam);
      if (subject && subject !== "All") q = q.eq("subject", subject);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CourseRow[];
    },
    staleTime: 5 * 60 * 1000,
  });

  return { courses: query.data ?? [], loading: query.isPending };
};
