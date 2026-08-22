/** Strip optional surrounding quotes (common in .env files). */
function readEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function getSupabaseUrl(): string {
  const url = readEnv(import.meta.env.VITE_SUPABASE_URL);
  if (!url) {
    throw new Error(
      "Missing VITE_SUPABASE_URL. Add it to .env locally or GitHub Actions secrets for production builds.",
    );
  }
  return url;
}

/** Prefer publishable key; fall back to legacy anon JWT for older deployments. */
export function getSupabaseAnonKey(): string {
  const key =
    readEnv(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    readEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

  if (!key) {
    throw new Error(
      "Missing Supabase API key. Set VITE_SUPABASE_PUBLISHABLE_KEY (recommended) or VITE_SUPABASE_ANON_KEY in .env / CI secrets.",
    );
  }

  return key;
}
