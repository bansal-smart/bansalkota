import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SETTINGS_ID = "a0000000-0000-0000-0000-0000000b0057";

type RegistrationInput = {
  full_name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string | null;
  date_of_birth?: string | null;
  class_level?: string;
  target_exam?: string;
  school_name?: string | null;
  city?: string | null;
  state?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
  preferred_centre_id?: string | null;
  preferred_centre_label?: string | null;
  exam_mode?: "Online" | "Offline";
  exam_slot?: string | null;
};

const cleanText = (value: unknown) => typeof value === "string" ? value.trim() : "";
const nullableText = (value: unknown) => cleanText(value) || null;
const digits = (value: unknown) => cleanText(value).replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const input = await req.json() as RegistrationInput;
    const fullName = cleanText(input.full_name);
    const email = cleanText(input.email).toLowerCase();
    const phone = digits(input.phone);
    const classLevel = cleanText(input.class_level);
    const targetExam = cleanText(input.target_exam);
    const examSlot = nullableText(input.exam_slot);
    const examMode = input.exam_mode;

    if (fullName.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || !/^[6-9]\d{9}$/.test(phone) || !classLevel || !targetExam || !["Online", "Offline"].includes(examMode ?? "")) {
      return json({ error: "Please provide valid registration details." }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    let duplicateQuery = admin
      .from("boost_registrations")
      .select("email")
      .eq("phone", phone)
      .eq("class_level", classLevel)
      .eq("target_exam", targetExam)
      .neq("status", "cancelled");
    duplicateQuery = examSlot ? duplicateQuery.eq("exam_slot", examSlot) : duplicateQuery.is("exam_slot", null);
    const { data: possibleDuplicates, error: duplicateError } = await duplicateQuery.limit(25);
    if (duplicateError) throw duplicateError;
    if ((possibleDuplicates ?? []).some((row) => cleanText(row.email).toLowerCase() === email)) {
      return json({ code: "DUPLICATE_REGISTRATION" }, 409);
    }

    // The fee is server-owned: callers must not be able to create a free or
    // discounted registration by changing the browser payload.
    const { data: settings, error: settingsError } = await admin
      .from("boost_settings")
      .select("price_inr")
      .eq("id", SETTINGS_ID)
      .maybeSingle();
    if (settingsError) throw settingsError;
    const amount = Number(settings?.price_inr ?? 99);
    const isFree = amount <= 0;

    const { data: registration, error: insertError } = await admin
      .from("boost_registrations")
      .insert({
        full_name: fullName,
        email,
        phone,
        whatsapp: nullableText(input.whatsapp),
        date_of_birth: nullableText(input.date_of_birth),
        class_level: classLevel,
        target_exam: targetExam,
        school_name: nullableText(input.school_name),
        city: nullableText(input.city),
        state: nullableText(input.state),
        parent_name: nullableText(input.parent_name),
        parent_phone: nullableText(input.parent_phone),
        preferred_centre_id: input.preferred_centre_id || null,
        preferred_centre_label: nullableText(input.preferred_centre_label),
        exam_mode: examMode,
        exam_slot: examSlot,
        amount,
        payment_status: isFree ? "paid" : "pending",
        status: isFree ? "confirmed" : "registered",
        paid_at: isFree ? new Date().toISOString() : null,
      })
      .select("id, admit_card_number")
      .single();
    if (insertError) throw insertError;

    return json({ registration_id: registration.id, admit_card_number: registration.admit_card_number, amount });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Could not create registration" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
