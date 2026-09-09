// supabase-js's signInWithPassword() returns whatever message the Supabase
// Auth server sent, verbatim — including infra-level failures like a missing
// or invalid `apikey` header ("No API key found in request", "Invalid API
// key"). Those look nothing like a login form problem, but shown plainly in
// a "Sign-in failed" toast they read the same as a typo'd password to
// someone who doesn't know to check DevTools. Reword the known
// configuration/network failure modes so they're unmistakably not a
// credentials problem; leave genuine auth errors (bad password, blocked
// account, etc.) untouched.
export function describeSignInError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("api key") || m.includes("apikey")) {
    return `Configuration error, not a login problem: "${message}". The Supabase API key is missing or invalid on this deployment — contact a developer.`;
  }
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network request failed")) {
    return "Could not reach the sign-in server. Check your connection and try again.";
  }
  return message;
}
