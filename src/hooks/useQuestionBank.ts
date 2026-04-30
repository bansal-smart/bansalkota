import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BankQuestion = {
  id: string;
  created_by: string | null;
  subject: string;
  topic: string | null;
  difficulty: string;
  question_text: string;
  question_image_url: string | null;
  options: { id: number; text: string }[];
  correct_answer: number | number[];
  explanation: string | null;
  marks_correct: number;
  marks_wrong: number;
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

export const useQuestionBank = (filters: BankFilters = {}) => {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("question_bank")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (filters.subject && filters.subject !== "All") q = q.eq("subject", filters.subject);
    if (filters.difficulty && filters.difficulty !== "All")
      q = q.eq("difficulty", filters.difficulty.toLowerCase());
    if (filters.search) q = q.ilike("question_text", `%${filters.search}%`);
    const { data, error } = await q;
    if (!error && data) setQuestions(data as unknown as BankQuestion[]);
    setLoading(false);
  }, [filters.subject, filters.difficulty, filters.search]);

  useEffect(() => {
    load();
  }, [load]);

  return { questions, loading, reload: load };
};
