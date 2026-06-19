import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TestRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  test_type: string;
  exam_pattern: string;
  subjects: string[];
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  is_published: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

const TEST_COLUMNS =
  "id, title, slug, description, test_type, exam_pattern, subjects, duration_minutes, total_questions, total_marks, is_published, starts_at, ends_at, created_at";

export const useTests = (testType?: string) => {
  const query = useQuery({
    queryKey: ["tests", "published", testType ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("tests")
        .select(TEST_COLUMNS)
        .eq("is_published", true)
        .neq("test_mode", "cbt")
        .order("created_at", { ascending: false });
      if (testType && testType !== "all") q = q.eq("test_type", testType);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TestRow[];
    },
    staleTime: 2 * 60 * 1000,
  });
  return { tests: query.data ?? [], loading: query.isPending };
};
