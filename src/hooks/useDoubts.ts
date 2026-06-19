import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type DoubtRow = {
  id: string;
  user_id: string;
  subject: string;
  topic: string | null;
  question_text: string;
  image_url: string | null;
  status: string;
  ai_answer: string | null;
  assigned_teacher_id: string | null;
  created_at: string;
};

const DOUBT_COLUMNS =
  "id, user_id, subject, topic, question_text, image_url, status, ai_answer, assigned_teacher_id, created_at";

export const useDoubts = (mode: "mine" | "all" = "mine") => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["doubts", mode, user?.id ?? null];

  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("doubts").select(DOUBT_COLUMNS).order("created_at", { ascending: false });
      if (mode === "mine" && user) q = q.eq("user_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as DoubtRow[];
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!user) return;
    const invalidate = () => qc.invalidateQueries({ queryKey: key });
    const channel = supabase
      .channel(`doubts-${mode}-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "doubts" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "doubt_answers" }, invalidate)
      .subscribe();
    const onVisible = () => {
      if (document.visibilityState === "visible") invalidate();
    };
    window.addEventListener("focus", invalidate);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", invalidate);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, mode]);

  return { doubts: query.data ?? [], loading: query.isPending };
};
