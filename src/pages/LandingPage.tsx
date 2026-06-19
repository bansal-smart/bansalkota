import { Link } from "react-router-dom";
import { useState } from "react";
import {
  ArrowRight, BookOpen, Users, Award, MapPin, GraduationCap,
  Sparkles, Trophy, Quote, Play, Star,
  ShieldCheck, Target, Headphones, Atom, Stethoscope, Sprout,
  CheckCircle2, Microscope, ClipboardCheck, Brain, Lightbulb,
  FlaskConical, Calculator, PenTool, Rocket, BarChart3, Building2,
} from "lucide-react";
import BansalButton from "@/components/bansal/BansalButton";
import BansalCard from "@/components/bansal/BansalCard";
import BansalStat from "@/components/bansal/BansalStat";
import BansalBadge from "@/components/bansal/BansalBadge";
import {
  GlowBlob, GridTexture, DotTexture, CornerSparkles, FloatingIcons,
} from "@/components/bansal/BansalDecor";
import { useSiteTestimonials, useSiteStats } from "@/hooks/useSiteContent";
import UpcomingBatches from "@/components/landing/UpcomingBatches";
import ToppersWall from "@/components/landing/ToppersWall";
import ResourcesTeaser from "@/components/landing/ResourcesTeaser";
import CentresShowcase from "@/components/landing/CentresShowcase";
import LandingFAQ from "@/components/landing/LandingFAQ";
import LandingCTAForm from "@/components/landing/LandingCTAForm";
import WelcomeEnquiryPopup from "@/components/landing/WelcomeEnquiryPopup";

const iconMap: Record<string, any> = {
  Trophy, GraduationCap, Star, ShieldCheck, Award, Sparkles, Target,
  BookOpen, Users, Brain, Lightbulb, Rocket, BarChart3, Building2,
};

import mentorTeaching from "@/assets/bansal-mentor-v2.jpg";
import toppersImage from "@/assets/bansal-toppers-v2.jpg";
import indiaMap from "@/assets/bansal-pan-india.png";
import appMockup from "@/assets/bansal-app-v2.png";
import resultsBanner from "@/assets/bansal-results-banner.png";
import legacyBanner from "@/assets/bansal-legacy-banner.png";
import featureMentorship from "@/assets/feature-mentorship.png";
import featureTrackProgress from "@/assets/feature-track-progress.png";
import streamJee from "@/assets/stream-jee.png";
import streamNeet from "@/assets/stream-neet.png";
import streamPreFoundation from "@/assets/stream-prefoundation.png";

const streams = [
  {
    img: streamJee, title: "JEE", subtitle: "IIT-JEE Aspirants",
    tagline: "Cracking JEE Main + Advanced with strategy, speed & strong fundamentals.",
    Icon: Atom, to: "/courses?exam=jee",
  },
  {
    img: streamNeet, title: "NEET", subtitle: "Your Dream Doctor Starts Here",
    tagline: "Biology-first preparation by NEET top-rankers' mentors with 360° revision.",
    Icon: Stethoscope, to: "/courses?exam=neet",
  },
  {
    img: streamPreFoundation, title: "Pre Foundation", subtitle: "Class 6 – 10",
    tagline: "Build the early edge for IIT/NEET with concept-deep foundation batches.",
    Icon: Sprout, to: "/courses?exam=foundation",
  },
];

type ExamKey = "jee" | "neet" | "foundation";

const coursesByExam: Record<
  ExamKey,
  { name: string; duration: string; mode: string; icon: typeof BookOpen; perks: string[] }[]
> = {
  jee: [
    {
      name: "JEE Main + Advanced (Class XI)", duration: "2 Years", mode: "Classroom · Online", icon: GraduationCap,
      perks: ["Live + recorded sessions", "Weekly chapter tests", "Personal mentor pod"],
    },
    {
      name: "JEE Main + Advanced (Class XII)", duration: "1 Year", mode: "Classroom · Online", icon: Trophy,
      perks: ["AIR-focused problem sheets", "All-India test series", "1:1 doubt sessions"],
    },
    {
      name: "JEE Crash Course", duration: "3 Months", mode: "Online", icon: Rocket,
      perks: ["High-yield revision", "PYQ marathons", "Mock-test analytics"],
    },
  ],
  neet: [
    {
      name: "NEET-UG (Class XI)", duration: "2 Years", mode: "Classroom · Online", icon: GraduationCap,
      perks: ["Bio-Phy-Chem in depth", "NCERT mastery drills", "Mentor-led revisions"],
    },
    {
      name: "NEET-UG (Class XII)", duration: "1 Year", mode: "Classroom · Online", icon: Trophy,
      perks: ["Daily MCQ practice", "Full-syllabus tests", "Personal strategy plan"],
    },
    {
      name: "NEET Repeater Batch", duration: "1 Year", mode: "Classroom", icon: Award,
      perks: ["Gap analysis", "Concept rebuild", "Top-rank coaching"],
    },
  ],
  foundation: [
    {
      name: "Pre-Foundation (Class VI-VIII)", duration: "Annual", mode: "Classroom · Online", icon: BookOpen,
      perks: ["Concept-first teaching", "Logical reasoning", "Olympiad prep"],
    },
    {
      name: "Foundation (Class IX-X)", duration: "Annual", mode: "Classroom · Online", icon: BookOpen,
      perks: ["NTSE-ready curriculum", "Board + competitive blend", "Weekly mentor reviews"],
    },
    {
      name: "NTSE / Olympiad Booster", duration: "6 Months", mode: "Online", icon: Award,
      perks: ["Targeted question banks", "Time-bound drills", "Performance reports"],
    },
  ],
};

const achievements = [
  { value: "30+", label: "AIR in JEE Top 100", icon: Trophy },
  { value: "2,500+", label: "IIT Selections", icon: GraduationCap },
  { value: "5,000+", label: "NEET Qualifiers", icon: Star },
  { value: "40+", label: "Years of Legacy", icon: ShieldCheck },
];

const pillars = [
  { icon: Users, title: "Master Mentors", desc: "Faculty with 20+ years of competitive-exam mentoring." },
  { icon: BookOpen, title: "Legendary Material", desc: "Refined over 40 years of toppers and JEE/NEET patterns." },
  { icon: Target, title: "Personal Mentor", desc: "One-to-one mentor for every student — no one studies alone." },
  { icon: Headphones, title: "24×7 Support", desc: "Doubt solving, test analysis, and round-the-clock guidance." },
  { icon: Microscope, title: "Concept Labs", desc: "Live demos and visualisations that make physics & chem stick." },
  { icon: ClipboardCheck, title: "Track & Improve", desc: "Granular analytics on every test, every chapter, every week." },
];

const expertise = [
  {
    Icon: Brain, title: "Faculty Depth",
    desc: "IIT & AIIMS alumni faculty trained on the Bansal pedagogy — concepts first, application always.",
    bullets: ["12+ IIT alumni mentors", "8 PhD subject heads", "Trained in JEE/NEET pattern shifts"],
  },
  {
    Icon: PenTool, title: "Bansal Curriculum",
    desc: "The legendary modules that shaped 40+ years of toppers — refined every year for new exam patterns.",
    bullets: ["DPPs & sheets", "Sectional + full tests", "Detailed solution videos"],
  },
  {
    Icon: BarChart3, title: "Smart Test Engine",
    desc: "Adaptive practice, AI-graded reports and chapter-wise weakness maps to guide your next study hour.",
    bullets: ["Auto-saved attempts", "Subject breakdowns", "Personalised plan"],
  },
];

const testimonials = [
  { name: "Aarav Sharma", rank: "AIR 47 — JEE Advanced 2024", quote: "Bansal Classes transformed how I approach problems. The faculty guides you with a strategy, not just answers." },
  { name: "Ishita Verma", rank: "AIR 112 — NEET UG 2024", quote: "Personal attention from mentors and constant test practice made all the difference in my final year." },
  { name: "Rohan Mehta", rank: "AIR 286 — JEE Main 2024", quote: "From Pre-Foundation to JEE, Bansal has been my second home. Ideal for Scholars in every sense." },
];

const clpFeatures = [
  "Classroom sessions at 100+ Bansal centers",
  "Direct interaction with master mentors",
  "Daily doubt sessions & weekly tests",
  "Peer learning with India's top scholars",
  "Mentor pod for every student",
];
const dlpFeatures = [
  "Bansal's legendary printed study material",
  "Sectional & full-syllabus tests",
  "Detailed solution PDFs & videos",
  "Self-paced, exam-aligned schedule",
  "Online mentor check-ins every week",
];

const LandingPage = () => {
  const [exam, setExam] = useState<ExamKey>("jee");
  const { rows: dbTestimonials } = useSiteTestimonials();
  const { rows: dbStats } = useSiteStats();
  const liveTestimonials = dbTestimonials.length
    ? dbTestimonials.map((t) => ({ name: t.name, rank: t.rank_label ?? "", quote: t.quote }))
    : testimonials;
  const liveAchievements = dbStats.length
    ? dbStats.map((s) => ({ value: s.value + (s.suffix ?? ""), label: s.label, icon: iconMap[s.icon ?? "Award"] ?? Award }))
    : achievements;


  return (
    <div className="bg-background">
      <WelcomeEnquiryPopup />
      {/* 1. HERO */}
      <section className="relative bg-bansal-blue text-white overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-60" />
        <GlowBlob color="orange" size="lg" className="-right-32 -top-32" />
        <GlowBlob color="white" size="lg" className="-left-32 -bottom-32" />
        <FloatingIcons defaultTone="white" />

        <div className="relative container mx-auto px-4 py-10 md:py-20 lg:py-24 grid lg:grid-cols-[1.05fr_1fr] gap-8 md:gap-10 items-center">
          <div className="animate-fade-in-up">
            <BansalBadge tone="orange">
              <Sparkles className="h-3 w-3 mr-1" /> Since 1984 · Kota, Rajasthan
            </BansalBadge>
            <h1 className="mt-5 font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
              Ideal Guidance.{" "}
              <span className="text-bansal-orange">Exceptional Results.</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-white/85 max-w-xl">
              India's most trusted JEE &amp; NEET coaching institute since 1984. Powering dreams from Kota to every corner of India.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/courses">
                <BansalButton variant="cta">
                  Explore Courses <ArrowRight className="h-4 w-4" />
                </BansalButton>
              </Link>
              <Link to="/contact">
                <BansalButton variant="ghost-white">Enquire Now</BansalButton>
              </Link>
            </div>

            {/* Trust strip */}
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/75">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-bansal-orange" /> 40+ Yrs Legacy</span>
              <span className="flex items-center gap-1.5"><Trophy className="h-4 w-4 text-bansal-orange" /> 2,500+ IIT Selections</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-bansal-orange" /> 100+ Centres</span>
            </div>
          </div>

          <div className="relative animate-fade-in-up-delay-2 max-w-md mx-auto lg:max-w-none w-full">
            <div className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-2 shadow-2xl">
              <div className="relative h-auto rounded-2xl overflow-hidden bg-white">
                <div className="flex flex-row animate-marquee-x w-max">
                  {[resultsBanner, legacyBanner, resultsBanner, legacyBanner].map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={i < 2 ? (i === 0 ? "Bansal Classes — JEE Main Result 2026" : "Bansal Classes — 45+ Years of Excellence") : ""}
                      aria-hidden={i >= 2}
                      className="h-[220px] sm:h-[280px] lg:h-[320px] w-auto block flex-shrink-0"
                      loading="eager"
                    />
                  ))}
                </div>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-white to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent" />
                <span className="absolute top-3 right-3 rounded-full bg-bansal-orange px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">Latest Results</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. STATS BANNER */}
        <div className="relative border-t border-white/15 bg-white">
          <DotTexture tone="blue" className="opacity-40" />
          <div className="relative container mx-auto px-4 py-6 md:py-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { Icon: Play, value: "Daily", label: "Live Interactive Sessions" },
              { Icon: BookOpen, value: "10M+", label: "Tests, Papers & Notes" },
              { Icon: Headphones, value: "24×7", label: "Learning Support" },
              { Icon: Building2, value: "100+", label: "Offline Centres" },
            ].map(({ Icon, value, label }) => (
              <div key={label} className="text-center">
                <Icon className="h-5 w-5 mx-auto text-bansal-orange mb-1.5" />
                <BansalStat value={value} label={label} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. ACHIEVEMENTS */}
      <section className="relative py-10 md:py-16 bg-bansal-orange-light/40 section-decor">
        <DotTexture tone="orange" className="opacity-50 decor-fade" />
        <GlowBlob color="orange" size="md" className="right-0 top-0" />
        <div className="relative container mx-auto px-4">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-6 md:mb-8">
            <div>
              <BansalBadge tone="orange">Our Legacy</BansalBadge>
              <h2 className="mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-bansal-black">
                Numbers That Speak for Themselves
              </h2>
            </div>
            <Link to="/achievements" className="text-sm font-semibold text-bansal-blue hover:text-bansal-orange inline-flex items-center gap-1">
              View Wall of Fame <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {liveAchievements.map((a) => (
              <BansalCard key={a.label} className="relative !p-4 sm:!p-5 text-center">
                <CornerSparkles position="tr" />
                <div className="mx-auto h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-bansal-orange/10 flex items-center justify-center">
                  <a.icon className="h-5 w-5 sm:h-6 sm:w-6 text-bansal-orange" />
                </div>
                <div className="mt-2.5 font-display text-2xl sm:text-3xl font-extrabold text-bansal-blue">{a.value}</div>
                <div className="mt-1 text-[11px] sm:text-xs font-medium text-bansal-gray">{a.label}</div>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* 3b. STREAMS */}
      <section className="relative py-12 md:py-20 bg-white section-decor">
        <FloatingIcons
          defaultTone="blue"
          icons={[
            { Icon: Atom, top: "10%", left: "3%", size: 36, delay: 0, tone: "blue" },
            { Icon: FlaskConical, top: "80%", left: "8%", size: 32, delay: 1.4, tone: "orange" },
            { Icon: Calculator, top: "15%", right: "5%", size: 32, delay: 0.7, tone: "blue" },
            { Icon: Trophy, top: "70%", right: "4%", size: 36, delay: 2, tone: "orange" },
          ]}
        />
        <div className="relative container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10">
            <BansalBadge tone="orange">Choose Your Stream</BansalBadge>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-bansal-black">
              Pick the <span className="text-bansal-orange">Path to Your Dream</span>
            </h2>
            <p className="mt-2 text-sm md:text-base text-bansal-gray">
              JEE, NEET or Pre Foundation — every stream is engineered for serious scholars and supported by mentors who've coached the country's top ranks.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 stagger-children">
            {streams.map((s) => (
              <Link
                key={s.title}
                to={s.to}
                aria-label={`Explore ${s.title} courses`}
                className="group relative block rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover-lift transition-all ring-1 ring-border bg-bansal-blue"
              >
                <div className="relative aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5]">
                  <img
                    src={s.img}
                    alt={`${s.title} — ${s.subtitle}`}
                    className="absolute inset-0 w-full h-full object-contain p-3 transition-transform duration-500 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-bansal-blue/95 via-bansal-blue/40 to-transparent" />
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 text-bansal-blue px-3 py-1.5 text-[11px] font-bold shadow">
                    <s.Icon className="h-3.5 w-3.5 text-bansal-orange" /> {s.subtitle}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 text-white">
                    <div className="font-display text-2xl sm:text-3xl font-extrabold">{s.title}</div>
                    <p className="mt-1.5 text-xs sm:text-sm text-white/85 line-clamp-2">{s.tagline}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-bansal-orange">
                      Explore <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. WHY BANSAL */}
      <section className="relative py-12 md:py-20 bg-white section-decor">
        <GridTexture tone="blue" className="opacity-40 decor-fade" />
        <div className="relative container mx-auto px-4 grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="relative order-2 lg:order-1 max-w-md mx-auto lg:max-w-none w-full">
            <div className="aspect-[4/3] sm:aspect-square rounded-3xl overflow-hidden border-4 border-bansal-blue/10 shadow-xl bg-bansal-cream/40 flex items-center justify-center p-2 sm:p-3">
              <img
                src={mentorTeaching}
                alt="Bansal Classes mentor teaching at whiteboard"
                className="max-h-full max-w-full object-contain"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-bansal-orange text-white rounded-2xl p-4 sm:p-5 shadow-xl">
              <div className="font-display text-2xl sm:text-3xl font-extrabold">40+</div>
              <div className="text-[10px] sm:text-xs font-medium">Years of Excellence</div>
            </div>
            <Atom className="absolute -top-6 -left-6 h-16 w-16 text-bansal-orange/20 animate-float-slow hidden md:block" />
          </div>

          <div className="order-1 lg:order-2">
            <BansalBadge tone="blue">Why Bansal</BansalBadge>
            <h2 className="mt-4 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-bansal-black leading-tight">
              Built for <span className="text-bansal-orange">Scholars</span>. Backed by <span className="text-bansal-orange">Legacy</span>.
            </h2>
            <p className="mt-4 text-bansal-gray text-sm md:text-base">
              Four decades of disciplined preparation, master mentors, and a structured ecosystem designed to take every student to their highest potential.
            </p>
            <div className="mt-6 grid sm:grid-cols-2 gap-3 sm:gap-4">
              {pillars.map((p) => (
                <div key={p.title} className="flex gap-3 rounded-xl p-3 hover:bg-bansal-blue-light/40 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-bansal-blue-light flex items-center justify-center shrink-0">
                    <p.icon className="h-5 w-5 text-bansal-blue" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-bansal-black text-sm sm:text-base">{p.title}</div>
                    <div className="text-xs sm:text-sm text-bansal-gray">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-bansal-blue">
              <span className="flex items-center gap-1.5"><GraduationCap className="h-4 w-4 text-bansal-orange" /> 12 IIT alumni faculty</span>
              <span className="flex items-center gap-1.5"><Brain className="h-4 w-4 text-bansal-orange" /> 8 PhD subject heads</span>
              <span className="flex items-center gap-1.5"><Trophy className="h-4 w-4 text-bansal-orange" /> 40+ AIRs mentored</span>
            </div>
            <Link to="/about" className="inline-block mt-7">
              <BansalButton variant="cta">Read More <ArrowRight className="h-4 w-4" /></BansalButton>
            </Link>
          </div>
        </div>
      </section>

      {/* 4b. BANSAL EXPERTISE */}
      <section className="relative py-12 md:py-20 bg-gradient-to-br from-bansal-blue-light/50 to-bansal-orange-light/30 section-decor">
        <DotTexture tone="blue" className="opacity-30" />
        <GlowBlob color="orange" size="md" className="-right-20 -bottom-20" />
        <div className="relative container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10">
            <BansalBadge tone="blue">Bansal Expertise</BansalBadge>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-bansal-black">
              The Three Pillars of a <span className="text-bansal-orange">Bansal Topper</span>
            </h2>
            <p className="mt-2 text-sm md:text-base text-bansal-gray">
              Decades of teaching wisdom, modern test technology and a curriculum sharpened by every JEE & NEET pattern shift — all working for one student: you.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 stagger-children">
            {expertise.map((e) => (
              <BansalCard key={e.title} className="relative !p-5 sm:!p-6">
                <CornerSparkles position="tr" tone="blue" />
                <div className="h-12 w-12 rounded-xl bg-bansal-blue text-white flex items-center justify-center shadow-blue">
                  <e.Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-bansal-black">{e.title}</h3>
                <p className="mt-2 text-sm text-bansal-gray">{e.desc}</p>
                <ul className="mt-4 space-y-1.5">
                  {e.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs sm:text-sm text-bansal-black">
                      <CheckCircle2 className="h-4 w-4 text-bansal-orange shrink-0 mt-0.5" /> {b}
                    </li>
                  ))}
                </ul>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* 5. COURSES */}
      <section className="relative py-12 md:py-20 bg-white section-decor">
        <GridTexture tone="orange" className="opacity-30 decor-fade" />
        <div className="relative container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <BansalBadge tone="blue">Programs</BansalBadge>
            <h2 className="mt-4 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-bansal-black">
              Explore the Ideal Course For You
            </h2>
            <p className="mt-3 text-sm md:text-base text-bansal-gray">
              From Pre-Foundation to JEE Advanced &amp; NEET-UG — every Bansal batch combines master-mentor classes, the legendary Bansal study material, a smart test engine and a personal mentor who tracks you week after week.
            </p>
          </div>

          <div className="mt-8 flex justify-center gap-2 flex-wrap">
            {([
              { k: "jee", label: "JEE", Icon: Atom },
              { k: "neet", label: "NEET UG", Icon: Stethoscope },
              { k: "foundation", label: "Pre Foundation", Icon: Sprout },
            ] as const).map((t) => (
              <button
                key={t.k}
                onClick={() => setExam(t.k)}
                className={`inline-flex items-center gap-1.5 rounded-full px-5 sm:px-6 py-2 sm:py-2.5 text-sm font-semibold transition-all ${
                  exam === t.k
                    ? "bg-bansal-blue text-white shadow-blue"
                    : "bg-bansal-blue-light/60 text-bansal-blue hover:bg-bansal-blue/10"
                }`}
              >
                <t.Icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>

          <div className="mt-8 md:mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 stagger-children max-w-6xl mx-auto">
            {coursesByExam[exam].map((c) => (
              <BansalCard key={c.name} className="relative !p-5 flex flex-col">
                <CornerSparkles position="tr" />
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-bansal-orange-light flex items-center justify-center mb-3 sm:mb-4">
                  <c.icon className="h-5 w-5 sm:h-6 sm:w-6 text-bansal-orange" />
                </div>
                <h3 className="font-display text-base sm:text-lg font-bold text-bansal-black leading-snug">{c.name}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <BansalBadge tone="blue">{c.duration}</BansalBadge>
                  <BansalBadge tone="gray">{c.mode}</BansalBadge>
                </div>
                <ul className="mt-4 space-y-1.5 flex-1">
                  {c.perks.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-xs sm:text-sm text-bansal-gray">
                      <CheckCircle2 className="h-3.5 w-3.5 text-bansal-orange shrink-0 mt-0.5" /> {p}
                    </li>
                  ))}
                </ul>
                <Link to="/courses" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-bansal-blue hover:text-bansal-orange">
                  View Details <ArrowRight className="h-4 w-4" />
                </Link>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CLP vs DLP */}
      <section className="relative py-12 md:py-20 bg-bansal-blue-light/40 section-decor">
        <GlowBlob color="blue" size="md" className="-left-20 top-10" />
        <GlowBlob color="orange" size="md" className="-right-20 bottom-10" />
        <div className="relative container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <BansalBadge tone="blue">Teaching Programs</BansalBadge>
            <h2 className="mt-4 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-bansal-black">
              Two Ways to Learn the <span className="text-bansal-orange">Bansal Way</span>
            </h2>
            <p className="mt-3 text-sm md:text-base text-bansal-gray">Whether you walk into a Bansal center or learn from home, the standards stay legendary.</p>
          </div>
          <div className="mt-8 md:mt-10 grid md:grid-cols-2 gap-4 sm:gap-6">
            {[
              { title: "Classroom Learning Program (CLP)", Icon: Users, tone: "blue", features: clpFeatures, desc: "Live classroom sessions at 100+ Bansal centers, daily doubt sessions and a peer environment built for toppers." },
              { title: "Distance Learning Program (DLP)", Icon: BookOpen, tone: "orange", features: dlpFeatures, desc: "Bansal's legendary study material, sectional & full tests and detailed solutions — at your own pace." },
            ].map((p) => (
              <BansalCard key={p.title} className="!p-5 sm:!p-6 flex flex-col h-full">
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 sm:h-14 sm:w-14 rounded-xl ${p.tone === "blue" ? "bg-bansal-blue" : "bg-bansal-orange"} flex items-center justify-center shrink-0`}>
                    <p.Icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-bansal-black">{p.title}</h3>
                    <p className="mt-1.5 text-bansal-gray text-sm">{p.desc}</p>
                  </div>
                </div>
                <ul className="mt-5 space-y-2 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-bansal-black">
                      <CheckCircle2 className="h-4 w-4 text-bansal-orange shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/courses" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-bansal-blue hover:text-bansal-orange">
                  Know More <ArrowRight className="h-4 w-4" />
                </Link>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* 6b. Feature Showcase */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4 space-y-8 md:space-y-10">
          <div className="text-center max-w-2xl mx-auto">
            <BansalBadge tone="orange">Built-In Advantages</BansalBadge>
            <h2 className="mt-4 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-bansal-black">
              Built for Every Learner's Journey
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            <Link to="/mentorship" className="block rounded-3xl overflow-hidden shadow-lg hover-lift bg-white">
              <img
                src={featureMentorship}
                alt="Personal Mentorship — One-to-one attention, stronger concepts, better results"
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            </Link>
            <Link to="/dashboard" className="block rounded-3xl overflow-hidden shadow-lg hover-lift bg-white">
              <img
                src={featureTrackProgress}
                alt="Track Progress. Improve Faster — Real-time academic insights"
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            </Link>
          </div>
        </div>
      </section>

      {/* 7. BOOST */}
      <section className="py-12 md:py-16 bg-bansal-blue text-white relative overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-50" />
        <GlowBlob color="orange" size="lg" className="-right-20 -top-20" />
        <FloatingIcons defaultTone="white" icons={[
          { Icon: Trophy, top: "20%", left: "5%", size: 36, tone: "white" },
          { Icon: Sparkles, top: "70%", left: "12%", size: 28, delay: 1, tone: "white" },
          { Icon: Lightbulb, top: "30%", right: "10%", size: 32, delay: 0.6, tone: "white" },
        ]} />
        <div className="relative container mx-auto px-4 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <BansalBadge tone="orange">BOOST 2026</BansalBadge>
            <h2 className="mt-4 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight">
              Bansal Open Opportunity Scholarship Test
            </h2>
            <p className="mt-4 text-sm md:text-base text-white/85">
              Up to <span className="text-bansal-orange font-bold">90% Scholarship</span>. Open to Class V to XII. Just <span className="text-bansal-orange font-bold">₹99</span> to register.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["31 May 2026", "07 Jun 2026", "14 Jun 2026"].map((d) => (
                <span key={d} className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{d}</span>
              ))}
            </div>
          </div>
          <div className="text-center lg:text-right">
            <Link to="/boost" className="inline-block">
              <BansalButton variant="cta" className="text-base px-8 py-4">
                Register for ₹99 <ArrowRight className="h-5 w-5" />
              </BansalButton>
            </Link>
            <p className="mt-3 text-xs text-white/70">Apply before 30 May 2026, 6:00 PM</p>
          </div>
        </div>
      </section>

      {/* 8. TESTIMONIALS */}
      <section className="relative py-12 md:py-20 bg-bansal-orange-light/30 section-decor">
        <DotTexture tone="orange" className="opacity-40 decor-fade" />
        <div className="relative container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-6 md:gap-8 items-center mb-10 md:mb-12">
            <div className="lg:col-span-1">
              <BansalBadge tone="orange">Toppers Speak</BansalBadge>
              <h2 className="mt-4 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-bansal-black">
                Voices of <span className="text-bansal-orange">Excellence</span>
              </h2>
              <p className="mt-3 text-sm md:text-base text-bansal-gray">Real stories from real toppers who started their journey at Bansal Classes.</p>
              <Link to="/achievements" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-bansal-blue hover:text-bansal-orange">
                See All Toppers <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="lg:col-span-2">
              <div className="rounded-3xl overflow-hidden shadow-xl aspect-[16/9] bg-bansal-cream/40 flex items-center justify-center p-2 sm:p-3">
                <img
                  src={toppersImage}
                  alt="Bansal Classes toppers with awards"
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 stagger-children">
            {liveTestimonials.map((t) => (
              <BansalCard key={t.name} className="relative !p-5">
                <Quote className="h-7 w-7 text-bansal-blue/20" />
                <CornerSparkles position="br" />
                <p className="mt-3 text-sm sm:text-base text-bansal-black leading-relaxed">"{t.quote}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-bansal-blue text-white flex items-center justify-center font-display font-bold text-sm">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <div className="font-display font-bold text-bansal-black text-sm">{t.name}</div>
                    <div className="text-[11px] sm:text-xs font-semibold text-bansal-orange">{t.rank}</div>
                  </div>
                </div>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* 9. CENTERS */}
      <section className="relative py-12 md:py-20 bg-white section-decor">
        <GridTexture tone="blue" className="opacity-30 decor-fade" />
        <div className="relative container mx-auto px-4 grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <BansalBadge tone="blue">Pan-India Presence</BansalBadge>
            <h2 className="mt-4 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-bansal-black leading-tight">
              100+ Centers Across <span className="text-bansal-orange">India</span>
            </h2>
            <p className="mt-4 text-sm md:text-base text-bansal-gray">
              From our headquarters in Kota to every major city — find a Bansal center near you and start your journey with India's most trusted coaching legacy.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Kota", "Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Pune", "Jaipur", "Lucknow"].map((c) => (
                <span key={c} className="rounded-full bg-bansal-blue-light text-bansal-blue px-3 py-1 text-xs font-semibold">
                  <MapPin className="inline h-3 w-3 mr-1" />{c}
                </span>
              ))}
            </div>
            <Link to="/centers" className="inline-block mt-7">
              <BansalButton variant="primary">Find a Center <ArrowRight className="h-4 w-4" /></BansalButton>
            </Link>
          </div>
          <div className="relative max-w-sm mx-auto lg:max-w-none w-full">
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-bansal-blue-light to-bansal-orange-light/40 p-6 sm:p-8 flex items-center justify-center relative overflow-hidden">
              <DotTexture tone="blue" className="opacity-40" />
              <img
                src={indiaMap}
                alt="Bansal Classes centers across India"
                className="relative h-full w-full object-contain"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 10. APP CTA */}
      <section className="py-14 md:py-16 bg-bansal-orange text-white relative overflow-hidden">
        <GlowBlob color="white" size="lg" className="-right-20 -top-20" />
        <GlowBlob color="white" size="md" className="-left-20 -bottom-20" />
        <div className="relative container mx-auto px-4 grid lg:grid-cols-2 gap-8 md:gap-10 items-center">
          <div>
            <BansalBadge tone="gray">Coming Soon</BansalBadge>
            <h2 className="mt-4 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold">
              The Bansal Classes App
            </h2>
            <p className="mt-3 text-sm md:text-base text-white/90 max-w-lg">
              Expert faculty, live classes, instant doubt solving, and India's most-loved test series — all in your pocket.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 sm:gap-3">
              {["Expert Faculty", "Live Classes", "Doubt Solving", "Test Series"].map((f) => (
                <span key={f} className="rounded-full bg-white/20 px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold">{f}</span>
              ))}
            </div>
            <div className="mt-6 inline-flex items-center gap-3 rounded-xl bg-bansal-black px-5 py-3">
              <Play className="h-6 w-6 text-white" />
              <div>
                <div className="text-[10px] uppercase tracking-wide text-white/70">Coming soon on</div>
                <div className="font-display font-bold">Google Play</div>
              </div>
            </div>
          </div>
          <div className="relative flex justify-center">
            <img
              src={appMockup}
              alt="Bansal Classes mobile app preview"
              className="h-56 sm:h-72 md:h-80 lg:h-96 w-auto object-contain drop-shadow-2xl"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* 11. Upcoming Batches (live from DB) */}
      <UpcomingBatches />

      {/* 12. Toppers Wall (live from DB) */}
      <ToppersWall />

      {/* 13. Free Resources teaser */}
      <ResourcesTeaser />

      {/* 14. Centres Showcase (live from DB) */}
      <CentresShowcase />

      {/* 15. FAQ */}
      <LandingFAQ />

      {/* 16. Final CTA — writes to enquiries */}
      <LandingCTAForm />
    </div>
  );
};

export default LandingPage;
