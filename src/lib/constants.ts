/**
 * Single source of truth for shared filter/option lists.
 * Keep these here so Question Bank, Compete, Educator forms, etc. stay aligned.
 */

// Canonical subject list used across Question Bank, Educator applications, etc.
// Note: Compete historically uses "Math" instead of "Mathematics" — alias below.
export const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology", "Mental Ability"] as const;

// "All" prefix variant for filter UIs.
export const SUBJECTS_WITH_ALL = ["All", ...SUBJECTS] as const;

// Compete uses a slightly different label; expose both so that submission code
// can normalise. Prefer SUBJECTS in new code.
export const SUBJECTS_COMPETE = ["Physics", "Chemistry", "Math", "Biology", "Mental Ability"] as const;

// Accept both "Math" and "Mathematics" when filtering rows from mixed sources.
export const SUBJECTS_VALID_ANY = ["Physics", "Chemistry", "Math", "Mathematics", "Biology", "Mental Ability"] as const;

export type Subject = (typeof SUBJECTS)[number];

// Canonical student class levels used in every enquiry/admission form.
export const CLASS_LEVELS = [
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
  "Dropper",
] as const;
export type ClassLevel = (typeof CLASS_LEVELS)[number];
export const CLASS_LEVELS_WITH_ALL = ["All", ...CLASS_LEVELS] as const;

// The broad teaching tracks the institute organises students/questions into.
// "JEE (Main)" vs "JEE Advanced" are sub-exams within the JEE stream, not
// separate streams — that finer split lives in `exams`/`exam_pattern` instead.
export const STREAMS = ["JEE", "NEET", "Foundation"] as const;
export type Stream = (typeof STREAMS)[number];
export const STREAMS_WITH_ALL = ["All", ...STREAMS] as const;

// Test types, matching the `tests.test_type` values used when creating a
// test (CreateTestPage) — reused here so a question's Test Type tag lines up
// with the same taxonomy the rest of the platform uses for tests.
export const TEST_TYPES = [
  { value: "mock", label: "Mock Test" },
  { value: "chapter", label: "Chapter Test" },
  { value: "pyq", label: "Previous Year" },
  { value: "practice", label: "Practice" },
  { value: "review", label: "Review Test" },
  { value: "part", label: "Part Test" },
  { value: "full_syllabus", label: "Full Syllabus Test" },
  { value: "class", label: "Class Test" },
  { value: "special", label: "Special Test" },
] as const;
export type TestType = (typeof TEST_TYPES)[number]["value"];
export const testTypeLabel = (v: string | null | undefined): string =>
  TEST_TYPES.find((t) => t.value === v)?.label ?? v ?? "—";

// Question Bank's Class taxonomy: the Roman-numeral batch classes this
// institute actually teaches (Foundation IV–X, JEE/NEET senior-secondary
// XI–XIII, where XIII = dropper) — matching `course_batches.code` naming
// (e.g. "J-XI", "BOOST-XII-E"). Distinct from CLASS_LEVELS above (Arabic
// "Class 1"–"Class 12" + "Dropper"), which is the general admission/enquiry
// taxonomy used elsewhere and covers primary grades this list doesn't.
export const QUESTION_BANK_CLASSES = ["IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"] as const;
export type QuestionBankClass = (typeof QUESTION_BANK_CLASSES)[number];
export const QUESTION_BANK_CLASSES_WITH_ALL = ["All", ...QUESTION_BANK_CLASSES] as const;
export const QUESTION_BANK_JEE_NEET_CLASSES = ["XI", "XII", "XIII"] as const;
export const QUESTION_BANK_FOUNDATION_CLASSES = ["IV", "V", "VI", "VII", "VIII", "IX", "X"] as const;

