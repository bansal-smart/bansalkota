// Shared helpers for compete edge functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export async function getUser(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data } = await sb.auth.getUser();
  return data.user;
}

export function randomCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function getOrCreateRating(sb: ReturnType<typeof admin>, userId: string, exam: string) {
  const { data } = await sb
    .from("compete_ratings")
    .select("*")
    .eq("user_id", userId)
    .eq("target_exam", exam)
    .maybeSingle();
  if (data) return data;
  const { data: created } = await sb
    .from("compete_ratings")
    .insert({ user_id: userId, target_exam: exam })
    .select("*")
    .single();
  return created!;
}

export async function pickQuestionIds(
  sb: ReturnType<typeof admin>,
  subject: string,
  topic: string,
  count = 10,
): Promise<string[]> {
  // Pull a wider candidate set then shuffle in JS (PostgREST has no random()).
  let q = sb.from("compete_questions").select("id").eq("is_active", true);
  if (subject) q = q.eq("subject", subject);
  if (topic && topic !== "Any") q = q.eq("topic", topic);
  const { data } = await q.limit(60);
  let pool = (data ?? []).map((r) => r.id as string);
  if (pool.length < count) {
    // fall back to subject only
    const { data: d2 } = await sb.from("compete_questions").select("id").eq("is_active", true).eq("subject", subject).limit(60);
    pool = (d2 ?? []).map((r) => r.id as string);
  }
  if (pool.length < count) {
    const { data: d3 } = await sb.from("compete_questions").select("id").eq("is_active", true).limit(60);
    pool = (d3 ?? []).map((r) => r.id as string);
  }
  // shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export function eloDelta(myRating: number, oppRating: number, score: number, k = 32) {
  const expected = 1 / (1 + Math.pow(10, (oppRating - myRating) / 400));
  return Math.round(k * (score - expected));
}

export async function getProfileMini(sb: ReturnType<typeof admin>, userId: string) {
  const { data } = await sb.from("profiles").select("full_name, avatar_url, target_exam, class_level").eq("user_id", userId).maybeSingle();
  return data ?? { full_name: "Player", avatar_url: null, target_exam: "general", class_level: null };
}
