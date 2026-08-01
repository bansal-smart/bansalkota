// GoTrue's admin API intermittently rejects otherwise-valid service-role calls with
// "token is unverifiable ... unrecognized JWT kid" under bursts of rapid admin.auth.admin.*
// calls (seen during bulk password generation / bulk delete loops). It's transient — a
// retry a moment later succeeds — so callers doing many such calls in a loop should wrap
// each one with this instead of failing the item outright.
const TRANSIENT_JWT_ERROR = /unrecognized jwt kid|token is unverifiable|unable to parse or verify signature/i;

export async function withAuthRetry<T>(
  fn: () => Promise<{ data: T; error: { message: string } | null }>,
  attempts = 3,
): Promise<{ data: T; error: { message: string } | null }> {
  let last: { data: T; error: { message: string } | null };
  for (let i = 0; i < attempts; i++) {
    last = await fn();
    if (!last.error || !TRANSIENT_JWT_ERROR.test(last.error.message)) return last;
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 300 * (i + 1)));
  }
  return last!;
}
