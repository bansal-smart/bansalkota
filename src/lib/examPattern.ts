// `tests.exam_pattern` stores a lowercase-hyphenated internal slug (e.g.
// "jee-main"). This maps it to the exam's official display name so every
// place that shows it to a user renders the same, correctly formatted text
// instead of ad-hoc CSS transforms or string replacements on the raw slug.
const EXAM_PATTERN_LABELS: Record<string, string> = {
  "jee-main": "JEE (Main)",
  "jee-advanced": "JEE Advanced",
  neet: "NEET",
  foundation: "Foundation",
  boost: "BOOST",
};

export const examPatternLabel = (pattern: string | null | undefined): string => {
  if (!pattern) return "—";
  return EXAM_PATTERN_LABELS[pattern.toLowerCase()] ?? pattern;
};

// Maps a test's exam_pattern slug to the Question Bank's broader Stream
// taxonomy (JEE / NEET / Foundation — see `STREAMS` in constants.ts). Both
// "jee-main" and "jee-advanced" fold into the single "JEE" stream. Patterns
// with no matching stream (e.g. "boost") return null rather than guessing.
export const streamFromExamPattern = (pattern: string | null | undefined): string | null => {
  const p = (pattern ?? "").toLowerCase();
  if (p.startsWith("jee")) return "JEE";
  if (p === "neet") return "NEET";
  if (p === "foundation") return "Foundation";
  return null;
};
