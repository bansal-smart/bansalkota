// supabase-js surfaces a non-2xx Edge Function response as a generic
// FunctionsHttpError ("Edge Function returned a non-2xx status code") and
// does not parse the response body into `data` — the real reason the
// function rejected the request (validation, permission, DB error) only
// lives on `error.context`, a Response that has to be read separately.
// See CbtLoginPage.tsx for the original instance of this pattern.
export async function extractEdgeFunctionError(
  error: unknown,
  data: unknown,
  fallback: string,
): Promise<string> {
  const payload = data as { error?: string; message?: string } | null;
  if (payload?.error) return payload.error;
  if (payload?.message) return payload.message;

  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = (await ctx.json()) as { error?: string; message?: string };
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    } catch {
      /* body wasn't JSON — fall through */
    }
  }

  const raw = error instanceof Error ? error.message : "";
  if (raw && !/non-2xx|FunctionsHttpError/i.test(raw)) return raw;
  return fallback;
}
