import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Exam = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const FALLBACK_EXAMS = ["JEE Main", "JEE Advanced", "NEET", "Boards", "Foundation"];

export const useExams = (opts: { includeInactive?: boolean } = {}) => {
  const qc = useQueryClient();
  const key = ["exams", { includeInactive: !!opts.includeInactive }];
  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      let q = (supabase as any).from("exams").select("*").order("sort_order").order("name");
      if (!opts.includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Exam[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const exams = query.data ?? [];
  return {
    exams,
    examNames: exams.length ? exams.map((e) => e.name) : FALLBACK_EXAMS,
    loading: query.isPending,
    error: query.error ? (query.error as Error).message : null,
    reload: () => qc.invalidateQueries({ queryKey: key }),
  };
};
