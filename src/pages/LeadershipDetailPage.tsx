import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Quote, ChevronDown } from "lucide-react";
import BansalBadge from "@/components/bansal/BansalBadge";
import BansalButton from "@/components/bansal/BansalButton";
import { leadershipPhotos } from "@/content/bansal/about";

type Profile = {
  name: string;
  role: string;
  tags: string[];
  quote: string;
  intro: string;
  sections: { title: string; body: string }[];
  recognition?: string;
};

const profiles: Record<string, Profile> = {
  "vk-bansal": {
    name: "VK Bansal",
    role: "Founder, Bansal Classes",
    tags: ["Founder", "Visionary Educator", "Forever Honored"],
    quote:
      "Believe in yourself and strive for excellence with unwavering dedication. Success comes to those who persevere through challenges with a positive mindset and a thirst for knowledge.",
    intro:
      "VK Bansal was born on October 26, 1949, in the Jhansi district of Uttar Pradesh. His father was a government employee and his mother a homemaker. He graduated from the Indian Institute of Technology at Banaras Hindu University and worked at J. K. Synthetics in Kota before founding Bansal Classes in 1981 to provide proper guidance to JEE aspirants.",
    sections: [
      { title: "Guiding Teachers", body: "VK Bansal aimed for comprehensive JEE exam guidance through a structured curriculum and innovative teaching, offering personalised support and motivation. His holistic approach empowered students to master the syllabus and confidently face exam challenges." },
      { title: "Disciplinary Atmosphere", body: "He continuously evolved teaching methods to meet students' diverse needs, integrating the latest educational technologies to enhance understanding and performance. His adaptive approach ensured students were always well-prepared." },
      { title: "Setting High Standards", body: "Year after year, his leadership pushed boundaries in academic excellence — challenging both students and educators to strive for higher performance and fostering a culture of continuous improvement within Bansal Classes." },
      { title: "Building a Legacy", body: "VK Bansal aimed to leave a lasting impact on education by setting benchmarks in coaching innovation and success. His efforts revolutionised educational practices and continue to elevate student achievement across India." },
    ],
    recognition:
      "Though his untimely passing left a void in the educational community, his contributions continue to shape the lives of aspiring engineers across India. Remembering VK Bansal — a mentor, a visionary, a legend.",
  },
  "sameer-bansal": {
    name: "Sameer Bansal",
    role: "Managing Director & CEO, Bansal Classes Kota",
    tags: ["Mathematics Expert", "IITian Mentor", "Visionary Leader"],
    quote: "Success is not just about hard work — it's about smart strategy and relentless focus.",
    intro:
      "Sameer Bansal leads Bansal Classes, Kota — one of India's most prestigious coaching institutes for IIT-JEE & NEET. Known for his deep academic roots and modern leadership, he continues the legacy of founder VK Bansal by blending excellence, discipline and innovation.",
    sections: [
      { title: "Leadership Philosophy", body: "Emphasises smart and strategic learning for success, with a strong student-first approach that adapts to evolving JEE and NEET exam patterns. Author of renowned mathematics books used by aspirants nationwide." },
      { title: "Modern Outlook", body: "Drives the institute's transition into a hybrid offline + online ecosystem — bringing live classes, recorded lectures, smart test series and AI-assisted doubt solving to every Bansal student." },
    ],
    recognition: "Widely praised by both students and educators, Sameer Bansal is considered a 'Mathematical Gem' and a pillar of academic excellence.",
  },
  "mahima-bansal": {
    name: "Mahima Bansal",
    role: "Director & Academic Mentor, Bansal Classes Kota",
    tags: ["Academic Leader", "Mentor", "Women in Education"],
    quote: "Education is not just about achieving ranks, it's about nurturing purpose, passion and perseverance.",
    intro:
      "Mahima Bansal plays a pivotal role in upholding the academic excellence and administrative vision of Bansal Classes. With a strong educational background and commitment to empowering students, she bridges traditional values with modern pedagogical approaches.",
    sections: [
      { title: "Leadership & Initiatives", body: "Drives academic planning and student mentorship at Bansal Classes. Actively involved in performance tracking, learning enhancement and a student-first philosophy that motivates aspirants to perform with balance and confidence." },
      { title: "Mentoring the Next Generation", body: "Anchors faculty development and student support programs that have made Bansal a name synonymous with results — championing women in education along the way." },
    ],
    recognition: "Mahima Bansal is admired for her professional contributions and her ability to connect personally with students, offering them a nurturing and motivating environment. Her presence is a driving force behind the continued success and modernisation of the Bansal legacy.",
  },
  "neelam-bansal": {
    name: "Neelam Bansal",
    role: "Co-founder & Matriarch, Bansal Classes Kota",
    tags: ["Inspiration", "Pillar of Strength", "Visionary Support"],
    quote: "Behind every strong institution is a woman who nurtures it with selfless strength and unconditional support.",
    intro:
      "Mrs. Neelam Bansal has been the unwavering support system and guiding light behind the incredible success of Bansal Classes. As the wife of the legendary Mr. V.K. Bansal and mother of Mr. Sameer Bansal, her dedication, strength and wisdom have shaped the values and culture of the institution.",
    sections: [
      { title: "Legacy & Values", body: "Embodies compassion and resilience as the cornerstone of Bansal Classes. Provided silent leadership and moral guidance during the formative years of the institute — a source of emotional strength for students, teachers and family alike." },
    ],
    recognition: "Though often away from the spotlight, Mrs. Neelam Bansal's role has been foundational to the success of the Bansal family and its legacy in Indian education — a symbol of grace, strength and silent determination.",
  },
};

export default function LeadershipDetailPage() {
  const { slug = "" } = useParams();
  const profile = profiles[slug];
  if (!profile) return <Navigate to="/about" replace />;

  const initials = profile.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const photo = leadershipPhotos[slug];
  const nameParts = profile.name.split(" ");
  const firstName = nameParts.slice(0, -1).join(" ");
  const lastName = nameParts[nameParts.length - 1];

  return (
    <div className="bg-background">
      {/* CINEMATIC FULL-BLEED HERO */}
      <section className="relative w-full min-h-[70vh] md:min-h-[90vh] overflow-hidden bg-bansal-blue-dark">
        {photo ? (
          <img
            src={photo}
            alt={profile.name}
            className="absolute inset-0 w-full h-full object-cover object-top"
            loading="eager"
            // @ts-expect-error - fetchpriority is valid
            fetchpriority="high"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-bansal-orange to-bansal-orange-dark flex items-center justify-center">
            <span className="font-display text-[20rem] font-extrabold text-white/20 leading-none select-none">
              {initials}
            </span>
          </div>
        )}

        {/* Gradient overlays for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-bansal-blue-dark via-bansal-blue-dark/70 via-40% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-bansal-blue-dark/80 via-bansal-blue-dark/20 to-transparent" />
        <div className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-bansal-orange/25 blur-3xl pointer-events-none" />

        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 z-10">
          <div className="container mx-auto px-4 sm:px-6 pt-6">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-white/85 hover:text-bansal-orange text-sm font-medium backdrop-blur-sm bg-white/5 border border-white/15 px-3 py-1.5 rounded-full transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to About
            </Link>
          </div>
        </div>

        {/* Bottom-left content stack */}
        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="container mx-auto px-4 sm:px-6 pb-12 md:pb-20">
            <div className="max-w-4xl animate-fade-in">
              <div className="flex items-center gap-3 mb-5">
                <span className="h-px w-12 bg-bansal-orange" />
                <span className="text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold">
                  {profile.role}
                </span>
              </div>
              <h1
                className="font-display font-extrabold text-white leading-[0.9] tracking-tight"
                style={{ fontSize: "clamp(2.75rem, 9vw, 7.5rem)" }}
              >
                {firstName && <span className="block">{firstName}</span>}
                <span className="block text-bansal-orange">{lastName}</span>
              </h1>
              <div className="flex flex-wrap gap-2 mt-6">
                {profile.tags.map((t) => (
                  <BansalBadge key={t} tone="orange">
                    {t}
                  </BansalBadge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-4 right-6 z-10 hidden md:flex items-center gap-2 text-white/60 text-xs uppercase tracking-widest animate-pulse">
          Scroll <ChevronDown className="h-4 w-4" />
        </div>
      </section>

      {/* PULL-QUOTE BAND */}
      <section className="relative bg-bansal-cream py-16 md:py-20 overflow-hidden">
        <Quote
          className="absolute -top-6 left-4 md:left-12 h-40 w-40 text-bansal-orange/10"
          strokeWidth={1}
        />
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl relative">
          <blockquote className="font-display italic text-2xl md:text-4xl lg:text-5xl font-semibold text-bansal-blue leading-[1.15] tracking-tight">
            &ldquo;{profile.quote}&rdquo;
          </blockquote>
          <div className="mt-8 flex items-center gap-3">
            <span className="h-px w-10 bg-bansal-orange" />
            <span className="text-bansal-orange uppercase tracking-[0.2em] text-xs font-bold">
              {profile.name}
            </span>
          </div>
        </div>
      </section>

      {/* INTRO LEAD */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <p className="text-lg md:text-xl text-bansal-gray leading-relaxed first-letter:font-display first-letter:text-6xl first-letter:font-bold first-letter:text-bansal-orange first-letter:float-left first-letter:mr-3 first-letter:leading-none first-letter:mt-1">
            {profile.intro}
          </p>
        </div>
      </section>

      {/* EDITORIAL NUMBERED SECTIONS */}
      <section className="pb-16 md:pb-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <div className="flex items-center gap-3 mb-12">
            <span className="h-px w-12 bg-bansal-orange" />
            <span className="text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold">
              The Chapters
            </span>
          </div>
          <div className="divide-y divide-bansal-blue/10">
            {profile.sections.map((s, i) => (
              <article
                key={s.title}
                className="grid md:grid-cols-12 gap-6 md:gap-10 py-10 md:py-14 group"
              >
                <div className="md:col-span-3">
                  <div className="font-display text-6xl md:text-7xl font-extrabold text-bansal-orange/90 leading-none">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="mt-3 h-1 w-12 bg-bansal-blue/20 group-hover:bg-bansal-orange transition-colors" />
                </div>
                <div className="md:col-span-9">
                  <h3 className="font-display text-2xl md:text-3xl font-bold text-bansal-blue mb-3 tracking-tight">
                    {s.title}
                  </h3>
                  <p className="text-base md:text-lg text-bansal-gray leading-relaxed">
                    {s.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* RECOGNITION */}
      {profile.recognition && (
        <section className="pb-20 md:pb-28">
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
            <div className="relative bg-bansal-blue text-white rounded-2xl p-8 md:p-12 overflow-hidden shadow-2xl">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-bansal-orange/20 blur-3xl" />
              <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-white/5 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <span className="h-px w-10 bg-bansal-orange" />
                  <span className="text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold">
                    Recognition
                  </span>
                </div>
                <p className="font-display text-xl md:text-2xl leading-relaxed text-white/95">
                  {profile.recognition}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA FOOTER */}
      <section className="bg-gradient-to-br from-bansal-blue to-bansal-blue-dark text-white py-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
          <h2 className="font-display text-2xl md:text-4xl font-extrabold mb-3">
            Continue the Bansal Journey
          </h2>
          <p className="text-white/80 mb-8">
            Inspired by {profile.name.split(" ")[0]}? Talk to our admissions team or explore more of the family.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/contact">
              <BansalButton variant="cta">Enquire Now</BansalButton>
            </Link>
            <Link to="/about">
              <BansalButton variant="ghost-white">Back to Leadership</BansalButton>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
