import { QUESTION_BANK_CLASSES } from "@/lib/constants";

const VALID_CLASSES = new Set<string>(QUESTION_BANK_CLASSES);

/**
 * Extracts a Question Bank Class from a `course_batches.code` value (e.g.
 * "J-XI" → "XI", "BOOST-XII-E" → "XII", "XIII-V2" → "XIII"). Codes are
 * hyphen-separated; exactly one segment must match a known class for this to
 * be unambiguous. Codes with zero or multiple matching segments (e.g. "demo",
 * "DE-JEE", "TEST") return null rather than guessing.
 */
export const parseClassFromBatchCode = (code: string | null | undefined): string | null => {
  if (!code) return null;
  const matches = code.split("-").filter((seg) => VALID_CLASSES.has(seg));
  return matches.length === 1 ? matches[0] : null;
};

/**
 * Resolves a single default Class from the set of batch codes a test is
 * scoped to. Returns null (no default — leave the picker for manual
 * selection) when the batches are open-to-all, parse to more than one
 * distinct class, or none of them parse at all.
 */
export const classFromBatchCodes = (codes: (string | null | undefined)[]): string | null => {
  const parsed = new Set(codes.map(parseClassFromBatchCode).filter((c): c is string => !!c));
  return parsed.size === 1 ? [...parsed][0] : null;
};
