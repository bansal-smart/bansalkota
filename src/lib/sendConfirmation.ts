import { supabase } from "@/integrations/supabase/client";

/**
 * Fire-and-forget call to send-transactional-email. Never throws — submission
 * UI flow must not be blocked by email errors. Skips silently when no email.
 */
export async function sendConfirmation(opts: {
  templateName: string;
  recipientEmail?: string | null;
  idempotencyKey: string;
  templateData?: Record<string, unknown>;
}) {
  const email = (opts.recipientEmail || "").trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return;
  try {
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: opts.templateName,
        recipientEmail: email,
        idempotencyKey: opts.idempotencyKey,
        templateData: opts.templateData ?? {},
      },
    });
  } catch (e) {
    // swallow - email is best-effort
    console.warn("[sendConfirmation] failed", opts.templateName, e);
  }
}
