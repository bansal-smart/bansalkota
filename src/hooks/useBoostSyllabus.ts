import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const BOOST_SYLLABUS_BUCKET = "boost-syllabus";

export type BoostSyllabusRow = {
  id: string;
  class_label: string;
  sort_order: number;
  sample_paper_path: string | null;
  syllabus_path: string | null;
};

export function boostSyllabusPublicUrl(path: string): string {
  return supabase.storage.from(BOOST_SYLLABUS_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Public-facing Syllabus & Sample Paper grid shown on the BOOST page. */
export function useBoostSyllabus() {
  const query = useQuery({
    queryKey: ["boost_syllabus_resources"],
    queryFn: async (): Promise<BoostSyllabusRow[]> => {
      const { data, error } = await supabase
        .from("boost_syllabus_resources")
        .select("id, class_label, sort_order, sample_paper_path, syllabus_path")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
  return { rows: query.data ?? [], loading: query.isPending };
}
