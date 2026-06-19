import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BankQuestion = {
  id: string;
  created_by: string | null;
  subject: string;
  topic: string | null;
  difficulty: string;
  question_text: string;
  question_image_url: string | null;
  question_type: "mcq-single" | "mcq-multi" | "numerical" | "integer" | "assertion-reason";
  options: { id: number; text: string }[];
  option_images: string[] | null;
  correct_answer: number | number[] | { value: number };
  numerical_answer: number | null;
  tolerance: number;
  explanation: string | null;
  marks_correct: number;
  marks_wrong: number;
  partial_marking: boolean;
  tags: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type BankFilters = {
  subject?: string;
  difficulty?: string;
  search?: string;
};

export const QUESTION_BANK_KEY = ["question-bank"] as const;

const fetchBank = async (filters: BankFilters) => {
  let q = supabase
    .from("question_bank")
    .select("id, created_by, subject, topic, difficulty, question_text, question_image_url, question_type, options, option_images, tolerance, marks_correct, marks_wrong, partial_marking, tags, is_public, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (filters.subject && filters.subject !== "All") q = q.eq("subject", filters.subject);
  if (filters.difficulty && filters.difficulty !== "All") {
    q = q.eq("difficulty", filters.difficulty.toLowerCase());
  }
  if (filters.search) q = q.ilike("question_text", `%${filters.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<Record<string, unknown> & { id: string }>;
  if (rows.length === 0) return [] as BankQuestion[];

  // Fetch the gated answer columns through the staff-only RPC and merge.
  const ids = rows.map((r) => r.id);
  const { data: ans } = await supabase.rpc("admin_get_question_bank_full", { _ids: ids });
  const ansMap = new Map<string, { correct_answer: unknown; numerical_answer: number | null; explanation: string | null }>(
    ((ans ?? []) as Array<{ id: string; correct_answer: unknown; numerical_answer: number | null; explanation: string | null }>)
      .map((a) => [a.id, { correct_answer: a.correct_answer, numerical_answer: a.numerical_answer, explanation: a.explanation }]),
  );
  return rows.map((r) => ({
    ...r,
    ...(ansMap.get(r.id) ?? { correct_answer: null, numerical_answer: null, explanation: null }),
  })) as unknown as BankQuestion[];
};

export const useQuestionBank = (filters: BankFilters = {}) => {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: [...QUESTION_BANK_KEY, filters.subject ?? "All", filters.difficulty ?? "All", filters.search ?? ""],
    queryFn: () => fetchBank(filters),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  return {
    questions: data ?? [],
    loading: isLoading,
    reload: () => qc.invalidateQueries({ queryKey: QUESTION_BANK_KEY }),
    refetch,
  };
};
