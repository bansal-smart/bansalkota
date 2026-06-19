import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LiveClassRow = {
  id: string;
  slug: string;
  title: string;
  subject: string;
  educator_name: string;
  educator_avatar: string | null;
  target_exam: string | null;
  status: string;
  starts_at: string;
  ends_at: string | null;
  meeting_url: string | null;
  recording_url: string | null;
  description: string | null;
  created_by: string | null;
};

const LIVE_COLUMNS =
  "id, slug, title, subject, educator_name, educator_avatar, target_exam, status, starts_at, ends_at, meeting_url, recording_url, description, created_by";

export const useLiveClasses = (filter: "all" | "live" | "upcoming" | "past" = "all") => {
  const qc = useQueryClient();
  const key = ["live_classes", filter];
  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const now = new Date().toISOString();
      let q = supabase.from("live_classes").select(LIVE_COLUMNS).order("starts_at", { ascending: true });
      if (filter === "live") q = q.eq("status", "live");
      else if (filter === "upcoming") q = q.gte("starts_at", now).neq("status", "completed");
      else if (filter === "past") q = q.eq("status", "completed");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LiveClassRow[];
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`live-classes-${filter}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_classes" }, () => {
        qc.invalidateQueries({ queryKey: key });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return { classes: query.data ?? [], loading: query.isPending };
};
