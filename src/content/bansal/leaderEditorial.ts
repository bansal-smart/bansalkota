// Unique editorial content for each leadership profile page.
// Used as fallbacks / enrichments on top of DB-driven `useLeader()` data
// so every leader page tells a *different* story with its own gallery,
// timeline and signature pillars.
import sameerPortraitDark from "@/assets/sameer-portrait-dark.png.asset.json";
import sameerBranded from "@/assets/sameer-branded.png.asset.json";
import sameerHeadshot from "@/assets/sameer-headshot.jpg.asset.json";
import sameerSpeaking from "@/assets/sameer-speaking.jpg.asset.json";
// Refreshed primary portraits (v2)
import sameerPortraitV2 from "@/assets/sameer-portrait-v2.jpg";
import vkPortraitV2 from "@/assets/vk-bansal-portrait-v2.jpg";
import mahimaPortraitV2 from "@/assets/mahima-portrait-v2.jpg";
import neelamPortraitV2 from "@/assets/neelam-portrait-v2.jpg";
import vkDesk from "@/assets/vk-bansal-desk.jpg.asset.json";
import vkLibrary from "@/assets/vk-bansal-library.jpg.asset.json";
import vkStatesman from "@/assets/vk-bansal-statesman.jpg.asset.json";
import vkChalkboard from "@/assets/vk-bansal-chalkboard.jpg.asset.json";
import bookCalculus from "@/assets/book-calculus.png.asset.json";
import bookAlgebra from "@/assets/book-algebra.png.asset.json";
import bookCoordinate from "@/assets/book-coordinate.png.asset.json";
import bookMathematics from "@/assets/book-mathematics.png.asset.json";

// Sameer Sir's authored books — shown on his About page
export const sameerBooks = [
  {
    title: "Problems in Calculus",
    subtitle: "JEE Main + Advanced",
    cover: bookCalculus.url,
    edition: "G.R. Bathla & Sons",
  },
  {
    title: "Problems in Algebra",
    subtitle: "JEE Main + Advanced",
    cover: bookAlgebra.url,
    edition: "G.R. Bathla & Sons",
  },
  {
    title: "Coordinate Geometry, Trigonometry, Vectors & 3D Geometry",
    subtitle: "JEE Main + Advanced",
    cover: bookCoordinate.url,
    edition: "G.R. Bathla & Sons",
  },
  {
    title: "1000 Challenging Problems in Mathematics",
    subtitle: "JEE Main + Advanced",
    cover: bookMathematics.url,
    edition: "G.R. Bathla & Sons",
  },
];

export type LeaderTimelineItem = { year: string; title: string; body: string };
export type LeaderPillar = { title: string; body: string };

export type LeaderEditorial = {
  // Visual identity
  accentLabel: string; // small uppercase tag in hero band
  signatureLine: string; // single-line signature shown over gallery
  galleryCaption: string; // caption above mosaic
  gallery: { src: string; alt: string; tall?: boolean }[];
  // Optional overrides
  heroPhotoOverride?: string; // overrides DB hero_photo_url on the page
  // Story
  timelineHeading: string;
  timeline: LeaderTimelineItem[];
  // Philosophy block
  pillarsHeading: string;
  pillars: LeaderPillar[];
  // Outro
  closingNote: string;
};

const u = (id: string, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const leaderEditorial: Record<string, LeaderEditorial> = {
  "vk-bansal": {
    accentLabel: "The Architect of Kota",
    signatureLine: "A single chalkboard in 1981 — and a teaching tradition that reshaped Indian engineering education.",
    galleryCaption: "Since 1981, one classroom philosophy",
    heroPhotoOverride: vkPortraitV2,
    gallery: [
      { src: vkStatesman.url, alt: "Mr. Bansal Sir — formal statesman portrait", tall: true },
      { src: vkDesk.url, alt: "Bansal Sir at his founder's desk" },
      { src: vkChalkboard.url, alt: "Bansal Sir teaching mathematics at the chalkboard" },
      { src: vkLibrary.url, alt: "Bansal Sir in his study with books" },
    ],
    timelineHeading: "Defining Moments",
    timeline: [
      {
        year: "1949",
        title: "Born in Jhansi",
        body: "A small-town boyhood that quietly built an extraordinary appetite for mathematics.",
      },
      {
        year: "1971",
        title: "Graduates from IIT-BHU",
        body: "Mechanical engineering at the Indian Institute of Technology, Banaras Hindu University.",
      },
      {
        year: "1974",
        title: "Joins J.K. Synthetics, Kota",
        body: "A young engineer arrives in a sleepy industrial town that history would soon rewrite.",
      },
      {
        year: "1981",
        title: "Bansal Classes is born",
        body: "The first batch of seven students learns mathematics in a borrowed room. Kota's coaching era begins here.",
      },
      {
        year: "1991",
        title: "JEE results stun the country",
        body: "An unknown institute starts producing All-India ranks. Aspirants begin migrating to Kota.",
      },
      {
        year: "Today",
        title: "A living legacy",
        body: "Honoured by educators across India, his pedagogy is still taught — and still loved.",
      },
    ],
    pillarsHeading: "His Teaching Code",
    pillars: [
      { title: "Concept before shortcut", body: "Never let a formula travel without its idea." },
      { title: "Ruthless basics", body: "If the foundation cracks, the building cannot be saved by speed." },
      { title: "Quiet discipline", body: "Show up, prepare, teach. Every day since 1981." },
    ],
    closingNote: "Every Bansal Classes blackboard, in every city, still answers to the standard he set in 1981.",
  },

  "sameer-bansal": {
    accentLabel: "Mathematics, Re-engineered",
    signatureLine:
      "An IITian son who turned his father's classroom into a national learning system — without losing its soul.",
    galleryCaption: "Inside the chair of the CEO",
    heroPhotoOverride: sameerPortraitV2,
    gallery: [
      { src: sameerBranded.url, alt: "Sameer Bansal — MD & CEO, Bansal Classes", tall: true },
      { src: sameerHeadshot.url, alt: "Sameer Bansal portrait" },
      { src: sameerSpeaking.url, alt: "Sameer Bansal addressing students" },
      { src: sameerPortraitDark.url, alt: "Sameer Bansal — formal portrait" },
    ],
    timelineHeading: "Chapters of Leadership",
    timeline: [
      {
        year: "Author",
        title: "4 best-selling JEE preparation books",
        body: "Author of 4 best-selling books for JEE preparation — Problems in Calculus, Algebra, Coordinate Geometry, and Trigonometry & Vectors.",
      },
      {
        year: "Mentor",
        title: "Mentor to All India Rank 1 and single-digit ranks — repeatedly",
        body: "Personally mentors top JEE Advanced ranks year after year, including AIR 1 and multiple single-digit AIRs.",
      },
      {
        year: "Teacher",
        title: "Returns to the classroom",
        body: "Joins his father — not as heir, but as an instructor evaluated by his students first.",
      },
      {
        year: "CEO",
        title: "Takes the institute national",
        body: "Launches multi-city expansion, online live classes and a unified test platform.",
      },
      {
        year: "Now",
        title: "Architect of the new Bansal",
        body: "Tech-first, mentor-led, exam-obsessed — without abandoning a single original value.",
      },
    ],
    pillarsHeading: "How He Builds",
    pillars: [
      {
        title: "Student-first product thinking",
        body: "Every feature, fee structure and faculty hire is judged by one question — does it help a real aspirant?",
      },
      { title: "Mentor density", body: "Scale must never dilute the 1:1 conversations that change ranks." },
      {
        title: "Data over drama",
        body: "Decisions live and die by attempt analytics, mock-test medians and concept mastery curves.",
      },
    ],
    closingNote:
      "Under his watch, the Bansal blackboard learned to talk to a phone screen — and still teach like a master.",
  },

  "mahima-bansal": {
    accentLabel: "Academic Mentor · Director",
    signatureLine:
      "A modern educator shaping the next generation of women aspirants — with empathy, structure and uncompromising standards.",
    galleryCaption: "Mentorship in motion",
    heroPhotoOverride: mahimaPortraitV2,
    gallery: [
      { src: mahimaPortraitV2, alt: "Mahima Bansal — Academic Mentor & Director", tall: true },
      { src: u("photo-1577896851231-70ef18881754"), alt: "Library study session" },
      { src: u("photo-1543269865-cbf427effbad"), alt: "Group discussion" },
      { src: u("photo-1580582932707-520aed937b7b"), alt: "Counselling session" },
    ],
    timelineHeading: "Her Journey So Far",
    timeline: [
      {
        year: "Education",
        title: "Trained in academic leadership",
        body: "Built early credentials in pedagogy and student counselling.",
      },
      {
        year: "Entry",
        title: "Joins Bansal Classes",
        body: "Steps into the family institute — choosing the longest and toughest path: teaching first.",
      },
      {
        year: "Director",
        title: "Leads academic strategy",
        body: "Owns curriculum design, mentor training and student-experience programmes.",
      },
      {
        year: "Today",
        title: "Champion of inclusive coaching",
        body: "Drives initiatives that bring more women aspirants — and more empathy — into Kota.",
      },
    ],
    pillarsHeading: "What She Stands For",
    pillars: [
      {
        title: "Mentor, not monitor",
        body: "Children don't need surveillance. They need belief, structure and a person who turns up.",
      },
      {
        title: "Gender-aware coaching",
        body: "Safe hostels, role models, peer circles — small details that change life outcomes.",
      },
      {
        title: "Quietly raising the bar",
        body: "She measures success not by toppers alone, but by how the average student grows.",
      },
    ],
    closingNote: "Her chapter is being written right now — and it's already shifting what coaching feels like.",
  },

  "neelam-bansal": {
    accentLabel: "Co-founder · The Quiet Pillar",
    signatureLine: "Behind every great institute is a household that believed in it first. Hers did.",
    galleryCaption: "The home that built an institution",
    heroPhotoOverride: neelamPortraitV2,
    gallery: [
      { src: neelamPortraitV2, alt: "Neelam Bansal — Co-founder & Matriarch", tall: true },
      { src: u("photo-1545239351-1141bd82e8a6"), alt: "Warm lamp-lit study" },
      { src: u("photo-1499063078284-f78f7d89616a"), alt: "Old family photograph" },
      { src: u("photo-1532012197267-da84d127e765"), alt: "Books on a table" },
    ],
    timelineHeading: "A Life of Quiet Building",
    timeline: [
      {
        year: "Early years",
        title: "Partner from day one",
        body: "Stood beside Mr. Bansal Sir when the institute was still a single classroom and an uncertain idea.",
      },
      {
        year: "1980s",
        title: "Anchor of the founding family",
        body: "Held the home steady as the Kota coaching revolution began — making the long hours possible.",
      },
      {
        year: "Always",
        title: "Mentor to her own children",
        body: "Raised the next generation of leaders with the same patience she gave the institute.",
      },
      {
        year: "Today",
        title: "Matriarch & moral compass",
        body: "Her voice still shapes the values every Bansal teacher quietly carries into class.",
      },
    ],
    pillarsHeading: "What She Gives",
    pillars: [
      { title: "Unseen labour", body: "The kind that institutes are actually built on — and rarely talk about." },
      { title: "Steadiness", body: "When the world changes fast, somebody must stay still on purpose." },
      {
        title: "Family-grade integrity",
        body: "Treat every student the way you'd treat your own child. Then do it again tomorrow.",
      },
    ],
    closingNote: "Bansal Classes is, first, a family. She is the reason that sentence is true.",
  },
};
