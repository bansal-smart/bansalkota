import { useEffect } from "react";
import { useQuery, useQueryClient, QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteTestimonial = {
  id: string;
  name: string;
  rank_label: string | null;
  quote: string;
  avatar_url: string | null;
  rating: number | null;
  region: string | null;
  sort_order: number;
  is_active: boolean;
};

export type SiteStat = {
  id: string;
  key: string;
  label: string;
  value: string;
  suffix: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
};

export type LeadershipProfile = {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  hero_photo_url: string | null;
  headline: string | null;
  pull_quote: string | null;
  intro: string | null;
  recognition_text: string | null;
  tags: string[] | null;
  sort_order: number;
  is_active: boolean;
};

export type LeadershipSection = {
  id: string;
  leadership_id: string;
  heading: string;
  body: string;
  sort_order: number;
};

// One shared realtime channel for all site-content tables.
// Subscribers ref-count: the channel opens on first mount and closes when the
// last hook unmounts, so multiple components don't each open their own socket.
let sharedChannel: ReturnType<typeof supabase.channel> | null = null;
let subscriberCount = 0;
let attachedClient: QueryClient | null = null;

const TABLES = ["site_testimonials", "site_stats", "leadership_profiles", "leadership_sections"] as const;

const invalidateAll = (qc: QueryClient) => {
  qc.invalidateQueries({ queryKey: ["site_testimonials"] });
  qc.invalidateQueries({ queryKey: ["site_stats"] });
  qc.invalidateQueries({ queryKey: ["leadership"] });
};

const useSharedSiteContentChannel = () => {
  const qc = useQueryClient();
  useEffect(() => {
    subscriberCount += 1;
    if (!sharedChannel) {
      attachedClient = qc;
      let ch = supabase.channel("site_content_shared");
      for (const table of TABLES) {
        ch = ch.on("postgres_changes", { event: "*", schema: "public", table }, () => {
          if (attachedClient) invalidateAll(attachedClient);
        });
      }
      sharedChannel = ch.subscribe();
    }
    return () => {
      subscriberCount -= 1;
      if (subscriberCount <= 0 && sharedChannel) {
        supabase.removeChannel(sharedChannel);
        sharedChannel = null;
        attachedClient = null;
        subscriberCount = 0;
      }
    };
  }, [qc]);
};

export function useSiteTestimonials() {
  useSharedSiteContentChannel();
  const query = useQuery({
    queryKey: ["site_testimonials", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_testimonials")
        .select("id, name, rank_label, quote, avatar_url, rating, region, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as SiteTestimonial[];
    },
    staleTime: 5 * 60 * 1000,
  });
  return { rows: query.data ?? [], loading: query.isPending };
}

export function useSiteStats() {
  useSharedSiteContentChannel();
  const query = useQuery({
    queryKey: ["site_stats", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_stats")
        .select("id, key, label, value, suffix, icon, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as SiteStat[];
    },
    staleTime: 5 * 60 * 1000,
  });
  return { rows: query.data ?? [], loading: query.isPending };
}

export function useLeadership() {
  useSharedSiteContentChannel();
  const query = useQuery({
    queryKey: ["leadership", "list"],
    queryFn: async () => {
      const [p, s] = await Promise.all([
        supabase.from("leadership_profiles").select("*").order("sort_order"),
        supabase.from("leadership_sections").select("*").order("sort_order"),
      ]);
      return {
        profiles: (p.data ?? []) as LeadershipProfile[],
        sections: (s.data ?? []) as LeadershipSection[],
      };
    },
    staleTime: 5 * 60 * 1000,
  });
  return {
    profiles: query.data?.profiles ?? [],
    sections: query.data?.sections ?? [],
    loading: query.isPending,
  };
}

export function useLeader(slug: string) {
  useSharedSiteContentChannel();
  const query = useQuery({
    queryKey: ["leadership", "detail", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data: p } = await supabase
        .from("leadership_profiles")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!p) return { profile: null as LeadershipProfile | null, sections: [] as LeadershipSection[] };
      const { data: s } = await supabase
        .from("leadership_sections")
        .select("*")
        .eq("leadership_id", (p as LeadershipProfile).id)
        .order("sort_order");
      return {
        profile: (p as LeadershipProfile) ?? null,
        sections: (s ?? []) as LeadershipSection[],
      };
    },
    staleTime: 5 * 60 * 1000,
  });
  return {
    profile: query.data?.profile ?? null,
    sections: query.data?.sections ?? [],
    loading: query.isPending,
  };
}
