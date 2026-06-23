import vkBansalPhotoAsset from "@/assets/leader-portraits/vk-bansal-latest.png.asset.json";
const vkBansalPhoto = vkBansalPhotoAsset.url;
import sameerBansalPhotoAsset from "@/assets/leader-portraits/sameer-bansal-latest-v2.png.asset.json";
const sameerBansalPhoto = sameerBansalPhotoAsset.url;
import mahimaBansalPhotoAsset from "@/assets/leader-portraits/mahima-bansal-latest-v2.png.asset.json";
const mahimaBansalPhoto = mahimaBansalPhotoAsset.url;
import neelamBansalPhotoAsset from "@/assets/leader-portraits/neelam-bansal-latest-v2.png.asset.json";
const neelamBansalPhoto = neelamBansalPhotoAsset.url;

export const bansalStats = [
  { value: "Daily", label: "Live Interactive Sessions" },
  { value: "10M+", label: "Tests, papers & notes" },
  { value: "24 × 7", label: "Doubt support" },
  { value: "100+", label: "Offline centers" },
];

export const teachingMethodology = [
  {
    title: "Classroom Learning Program (CLP)",
    desc: "In-person, structured classroom sessions with personal mentoring, regular assessments, and conceptual clarity for JEE / NEET / Foundation aspirants.",
  },
  {
    title: "Distance Learning Program (DLP)",
    desc: "Expertly curated study material, online test series and remote academic support for students who cannot attend our centers physically.",
  },
  {
    title: "Online Live & Recorded",
    desc: "India's best educators on a digital platform — live interactive sessions plus replayable recordings, doubt solving and weekly tests.",
  },
];

export const visionPoints = [
  "Innovative Learning Hub",
  "Empowering Future Leaders",
  "Inclusive Education",
  "Leading Educational Excellence",
  "Nationwide Impact",
  "Student-Centric Approach",
  "Commitment to Results",
  "Nurturing Minds, Shaping Futures",
];

export const missionPoints = [
  "Provide Equal Opportunities",
  "Adopt Innovative Methods",
  "Student-Centered Approach",
  "Supportive Learning Environment",
  "Resource Availability",
  "Student Empowerment",
  "Quality Teaching",
  "Regular Assessments & Feedback",
];



export const leadershipPhotos: Record<string, string> = {
  "vk-bansal": vkBansalPhoto,
  "sameer-bansal": sameerBansalPhoto,
  "mahima-bansal": mahimaBansalPhoto,
  "neelam-bansal": neelamBansalPhoto,
};

export const leadership = [
  {
    slug: "vk-bansal",
    name: "VK Bansal Sir",
    role: "Founder",
    tagline: "Forever Honored — The Icon of Excellence in Education",
    photo: vkBansalPhoto,
  },
  {
    slug: "sameer-bansal",
    name: "Sameer Bansal",
    role: "MD & CEO",
    tagline:
      "Mentor of All India Rank 1 & single-digit JEE rankers · Author of 4 best-selling JEE preparation books · Visionary Leader",
    photo: sameerBansalPhoto,
  },
  {
    slug: "mahima-bansal",
    name: "Mahima Bansal",
    role: "Director & Academic Mentor",
    tagline: "Academic Leader · Mentor · Women in Education",
    photo: mahimaBansalPhoto,
  },
  {
    slug: "neelam-bansal",
    name: "Neelam Bansal",
    role: "Co-founder & Matriarch",
    tagline: "Inspiration · Pillar of Strength · Visionary Support",
    photo: neelamBansalPhoto,
  },
];
