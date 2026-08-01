import {
  Trophy,
  GraduationCap,
  Users,
  BookOpen,
  Sparkles,
  Calendar,
  Award,
  IndianRupee,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const BOOST_CONTENT_ID = "a0000000-0000-0000-0000-0000000b0058";

export type BoostBenefit = { icon: string; title: string; desc: string };

export type ExamRow =
  | { label: string; cells: string[] }
  | { label: string; span: string; href?: string };

export type ExamStructure = {
  paramHeader: string;
  columns: string[];
  rows: ExamRow[];
  legend: string;
  markingScheme: string;
};

export type ScholarshipRow = { score: string; scholarship: string };
export type TimelineItem = { phase: string; date: string; desc: string };
export type Faq = { q: string; a: string };

export type BoostContent = {
  legacy: { badge: string; heading: string; body: string; calloutTitle: string; calloutBody: string };
  benefits: BoostBenefit[];
  examStructure: ExamStructure;
  scholarshipGrid: ScholarshipRow[];
  notes: string[];
  timeline: TimelineItem[];
  faqs: Faq[];
};

/** Whitelisted lucide icons selectable for benefit cards. */
export const ICON_MAP: Record<string, LucideIcon> = {
  Trophy,
  GraduationCap,
  Users,
  BookOpen,
  Sparkles,
  Calendar,
  Award,
  IndianRupee,
};

export function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? Trophy;
}

/** Replace every `{price}` token with the live registration price. */
export function applyPriceToken(text: string, price: number): string {
  return text.split("{price}").join(String(price));
}

export function isSpanRow(row: ExamRow): row is { label: string; span: string; href?: string } {
  return "span" in row;
}

/** Split a list into [left, right] with the extra item on the left for odd counts. */
export function splitScholarship<T>(rows: T[]): [T[], T[]] {
  const mid = Math.ceil(rows.length / 2);
  return [rows.slice(0, mid), rows.slice(mid)];
}

/**
 * Full current /boost content. Doubles as the seed (see the
 * boost_page_content migration) and as the runtime fallback so the page
 * always renders, even when the DB row is missing or the fetch fails.
 */
export const DEFAULTS: BoostContent = {
  legacy: {
    badge: "Legacy of Excellence",
    heading: "Education City Kota's Oldest Institute",
    body: "Bansal Classes, KOTA is India's most trusted Institute for the preparation of JEE (Main & Advanced), NEET (UG), Olympiads & Foundation (School & Board Examinations). Started by legendary Shri V. K. Bansal Sir in 1981, it is Education City KOTA's oldest Institute.",
    calloutTitle: "What is BOOST?",
    calloutBody:
      "BOOST is a Scholarship Test to be conducted for the students currently studying in Classes 4th to 10th and 11th & 12th (PCM & PCB) in 2026-27 & moving to classes 5th to 12th & 12th Passed in Academic Session 2027-28.",
  },
  benefits: [
    {
      icon: "Trophy",
      title: "Upto 100% Scholarship",
      desc: "Win huge fee waivers on Bansal Classes JEE/NEET/Foundation programs based on your rank.",
    },
    {
      icon: "GraduationCap",
      title: "Personal Mentorship",
      desc: "Top 100 rankers get a one-on-one mentor session with Bansal senior faculty.",
    },
  ],
  examStructure: {
    paramHeader: "Parameter",
    columns: ["NEEV (Foundation)", "JEE (Main & Advanced)", "NEET (UG)"],
    rows: [
      { label: "Classes (in 2026-27)", cells: ["4th to 9th", "10th, 11th & 12th (PCM)", "10th, 11th & 12th (PCB)"] },
      { label: "Mode of Exam", span: "Online (At Home) / Offline (At Center)" },
      { label: "Medium", cells: ["ENGLISH", "ENGLISH", "ENGLISH"] },
      { label: "Duration", span: "60 Minutes (Online Test) | 90 Minutes (Offline Test)" },
      { label: "No. of Questions", cells: ["75 Ques.", "75 Ques.", "80 Ques."] },
      {
        label: "Subjects Wise Q's",
        cells: ["P: 15, C: 15, B: 15, M: 20, MA: 10", "P: 25, C: 25, M: 25", "P: 20, C: 20, Bo: 20, Z: 20"],
      },
      { label: "Syllabus", span: "Visit www.bansal.ac.in", href: "https://www.bansal.ac.in" },
    ],
    legend: "P: Physics, C: Chemistry, B: Biology, M: Mathematics, MA: Mental Ability, Bo: Botany, Z: Zoology",
    markingScheme:
      "+4 Marks will be given for every Correct Answer, 0 for Not Attempted & -1 for every wrong answer.",
  },
  scholarshipGrid: [
    { score: "≥95%", scholarship: "100%" },
    { score: "≥90% to <95%", scholarship: "90%" },
    { score: "≥85% to <90%", scholarship: "75%" },
    { score: "≥75% to <85%", scholarship: "60%" },
    { score: "≥65% to <75%", scholarship: "50%" },
    { score: "≥55% to <65%", scholarship: "40%" },
    { score: "≥45% to <55%", scholarship: "25%" },
    { score: "≥35% to <45%", scholarship: "10%" },
    { score: "≥25% to <35%", scholarship: "No Scholarship" },
    { score: "<25%", scholarship: "Not Selected" },
  ],
  notes: [
    "If a Student secures Upto 50% Scholarship, he/she will be directly offered that scholarship in Bansal Classes's Classroom Courses in Academic Session 2027-28. If a Student secures more than 50% Scholarship, he/she will be invited for Round-2 where his/her Interview will be scheduled with the Bansal Classes Faculty Team. Based on the recommendation of the Faculty Team, Scholarship may remain the same or be increased/decreased.",
    "If a student is eligible for any other scholarship based on other academic achievements like Board Exam, JEE, NEET, Olympiad performances or past association with Bansal Classes, then he/she will be considered for any one scholarship (Best of all).",
    "Scholarships will be offered only on the Tuition Fee Part of the total Fee.",
    "All the details mentioned in this leaflet are applicable for the Kota Center only. Other Study Centers may have different details.",
    "In case of any dispute, the jurisdiction shall be exclusively at Kota (Rajasthan).",
  ],
  timeline: [
    { phase: "Registration", date: "Open Now", desc: "Pay ₹{price} and reserve your slot on bansal.ac.in" },
    { phase: "Admit Card", date: "T-3 days", desc: "Download your admit card from the official portal" },
    { phase: "Test Day", date: "Every Sunday", desc: "Online slots and offline center slots available" },
    { phase: "Result", date: "Within 48 hrs", desc: "Scholarship + counselling call from Bansal admissions" },
  ],
  faqs: [
    {
      q: "Who can appear for BOOST?",
      a: "Any student from Class 5 to Class 12 (and droppers) preparing for school, Olympiads, JEE, or NEET can register.",
    },
    {
      q: "What will be the timings of the test?",
      a: "Duration of the Online test will be 1 Hour. A Student can appear in the test between 9 AM to 6 PM on the test day only.",
    },
    {
      q: "How to apply & where to take Online Test?",
      a: "You can apply online on www.bansal.ac.in after the registration, Student will receive a direct link to appear in the test.",
    },
    {
      q: "What is the syllabus of BOOST?",
      a: "Syllabus for each class is available on www.bansal.ac.in",
    },
    {
      q: "When will the result be declared?",
      a: "Result of first 3 BOOST Test (Which are free of Cost) shall be declared in the last week of September. Results of BOOST to be conducted from October 2026 will be declared after 3 days of BOOST.",
    },
    {
      q: "Can I appear in the test from the Institute campus?",
      a: "Yes. Student can visit BANSAL Classes, KOTA Campus & appear in the test. For the other Study Centers, Student need to contact the respective study center.",
    },
    {
      q: "What subjects are covered in BOOST?",
      a: "The test includes Math, Science, and Mental Ability / Logical Reasoning. For higher classes, it may include Physics, Chemistry, and Biology, depending on the student's stream and class.",
    },
    {
      q: "Can I take the test from home?",
      a: "Yes, the online mode is fully proctored. You can also choose an offline slot at a nearby Bansal center.",
    },
    {
      q: "How is the scholarship applied?",
      a: "Your scholarship percentage is auto-applied to your Bansal Classes course fee at the time of admission.",
    },
  ],
};

/**
 * Reads the single boost_page_content row. Falls back to DEFAULTS when the row
 * is absent or the fetch fails, so the public page always renders.
 */
export function useBoostContent() {
  const query = useQuery({
    queryKey: ["boost_page_content", BOOST_CONTENT_ID],
    queryFn: async (): Promise<BoostContent> => {
      const { data, error } = await supabase
        .from("boost_page_content" as any)
        .select("content")
        .eq("id", BOOST_CONTENT_ID)
        .maybeSingle();
      if (error) throw error;
      const content = (data as any)?.content;
      return content ? { ...DEFAULTS, ...(content as BoostContent) } : DEFAULTS;
    },
    staleTime: 10 * 60 * 1000,
  });
  return { content: query.data ?? DEFAULTS, loading: query.isPending };
}
