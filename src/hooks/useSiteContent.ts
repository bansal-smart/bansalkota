import { useEffect, useState } from "react";
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

export function useSiteTestimonials() {
  const [rows, setRows] = useState<SiteTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("site_testimonials")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (alive) {
        setRows((data ?? []) as SiteTestimonial[]);
        setLoading(false);
      }
    };
    load();
    const ch = supabase
      .channel("site_testimonials_pub")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_testimonials" }, load)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, []);
  return { rows, loading };
}

export function useSiteStats() {
  const [rows, setRows] = useState<SiteStat[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("site_stats")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (alive) {
        setRows((data ?? []) as SiteStat[]);
        setLoading(false);
      }
    };
    load();
    const ch = supabase
      .channel("site_stats_pub")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_stats" }, load)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, []);
  return { rows, loading };
}

export function useLeadership() {
  const [profiles, setProfiles] = useState<LeadershipProfile[]>([]);
  const [sections, setSections] = useState<LeadershipSection[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [p, s] = await Promise.all([
        supabase.from("leadership_profiles").select("*").order("sort_order"),
        supabase.from("leadership_sections").select("*").order("sort_order"),
      ]);
      if (alive) {
        setProfiles((p.data ?? []) as LeadershipProfile[]);
        setSections((s.data ?? []) as LeadershipSection[]);
        setLoading(false);
      }
    };
    load();
    const ch = supabase
      .channel("leadership_pub")
      .on("postgres_changes", { event: "*", schema: "public", table: "leadership_profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "leadership_sections" }, load)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, []);
  return { profiles, sections, loading };
}

export function useLeader(slug: string) {
  const [profile, setProfile] = useState<LeadershipProfile | null>(null);
  const [sections, setSections] = useState<LeadershipSection[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    if (!slug) { setLoading(false); return; }
    const load = async () => {
      const { data: p } = await supabase
        .from("leadership_profiles")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!alive) return;
      setProfile((p as LeadershipProfile) ?? null);
      if (p) {
        const { data: s } = await supabase
          .from("leadership_sections")
          .select("*")
          .eq("leadership_id", (p as LeadershipProfile).id)
          .order("sort_order");
        if (alive) setSections((s ?? []) as LeadershipSection[]);
      }
      if (alive) setLoading(false);
    };
    load();
    const ch = supabase
      .channel(`leader_${slug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leadership_profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "leadership_sections" }, load)
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [slug]);
  return { profile, sections, loading };
}
