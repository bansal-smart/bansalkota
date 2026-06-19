import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CourseRow } from "./useCourses";

export type LessonRow = {
  id: string;
  chapter_id: string;
  course_id: string;
  slug: string;
  title: string;
  position: number;
  duration_seconds: number;
  is_free_preview: boolean;
  type: string;
};

export type ChapterRow = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  lessons: LessonRow[];
};

export type CoursePdfRow = {
  id: string;
  course_id: string;
  title: string;
  file_url: string;
  size_bytes: number | null;
  position: number;
};

type Result = { course: CourseRow | null; chapters: ChapterRow[]; pdfs: CoursePdfRow[] };

const EMPTY: Result = { course: null, chapters: [], pdfs: [] };

export const useCourseDetail = (slug: string | undefined) => {
  const query = useQuery({
    queryKey: ["course_detail", slug],
    enabled: !!slug,
    queryFn: async (): Promise<Result> => {
      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("slug", slug!)
        .maybeSingle();
      if (!courseData) return EMPTY;

      const { data: chs } = await supabase
        .from("chapters")
        .select("id, course_id, title, position")
        .eq("course_id", courseData.id)
        .eq("is_published", true)
        .order("position");

      const chapterIds = (chs ?? []).map((c) => c.id);
      const { data: lessons } = chapterIds.length
        ? await supabase
            .from("lessons")
            .select("id, chapter_id, course_id, slug, title, position, duration_seconds, is_free_preview, type")
            .in("chapter_id", chapterIds)
            .eq("is_published", true)
            .order("position")
        : { data: [] as LessonRow[] };

      const grouped: ChapterRow[] = (chs ?? []).map((c) => ({
        ...c,
        lessons: ((lessons ?? []) as LessonRow[]).filter((l) => l.chapter_id === c.id),
      }));

      const { data: pdfData } = await supabase
        .from("course_pdfs")
        .select("id, course_id, title, file_url, size_bytes, position")
        .eq("course_id", courseData.id)
        .order("position");

      return {
        course: courseData as CourseRow,
        chapters: grouped,
        pdfs: (pdfData ?? []) as CoursePdfRow[],
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  const data = query.data ?? EMPTY;
  return { course: data.course, chapters: data.chapters, pdfs: data.pdfs, loading: query.isPending };
};
