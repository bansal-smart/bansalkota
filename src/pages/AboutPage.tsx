import { Link } from "react-router-dom";
import { ArrowRight, Eye, Target, BookOpen, Quote, Heart, ChevronDown } from "lucide-react";
import BansalButton from "@/components/bansal/BansalButton";
import BansalCard from "@/components/bansal/BansalCard";
import BansalStat from "@/components/bansal/BansalStat";
import vkBansalPortraitAsset from "@/assets/leadership/vk-bansal.webp.asset.json";
const vkBansalPortrait = vkBansalPortraitAsset.url;
import {
  bansalStats,
  teachingMethodology,
  visionPoints,
  missionPoints,
  leadership,
} from "@/content/bansal/about";
import { useSiteStats } from "@/hooks/useSiteContent";

const SECTION = "py-16 md:py-24";
const CONTAINER = "container mx-auto px-4 sm:px-6 lg:px-8";

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-3 mb-4 ${className}`}>
      <span className="h-px w-12 bg-bansal-orange" />
      <span className="text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold">
        {children}
      </span>
    </div>
  );
}

const AboutPage = () => {
  const { rows: dbStats } = useSiteStats();
  const liveStats = dbStats.length
    ? dbStats.map((s) => ({ value: s.value + (s.suffix ?? ""), label: s.label }))
    : bansalStats;

  return (
    <div className="bg-background">
      {/* ============= HERO ============= */}
      <section className="relative w-full min-h-[80vh] md:min-h-[90vh] flex items-end overflow-hidden bg-bansal-blue-dark">
        <img
          src={vkBansalPortrait}
          alt="Shri V.K. Bansal — Founder of Bansal Classes"
          className="absolute inset-0 w-full h-full object-cover object-top"
          loading="eager"
          // @ts-expect-error - fetchpriority is valid
          fetchpriority="high"
        />

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-bansal-blue-dark via-bansal-blue-dark/75 via-45% to-bansal-blue-dark/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-bansal-blue-dark/85 via-bansal-blue-dark/25 to-transparent" />
        <div className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-bansal-orange/30 blur-3xl pointer-events-none" />
        <div className="absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />

        {/* Top eyebrow chip */}
        <div className="absolute top-0 inset-x-0 z-10">
          <div className={`${CONTAINER} pt-8`}>
            <div className="inline-flex items-center gap-2 text-white/85 text-xs uppercase tracking-[0.3em] font-bold backdrop-blur-sm bg-white/5 border border-white/15 px-4 py-2 rounded-full">
              <Heart className="h-3.5 w-3.5 text-bansal-orange fill-bansal-orange" />
              About Bansal Classes
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`relative z-10 ${CONTAINER} pb-16 md:pb-24 pt-28`}>
          <div className="max-w-3xl animate-fade-in">
            <Eyebrow>Founder · 1949 – Forever Honored</Eyebrow>
            <h1
              className="font-display font-extrabold text-white leading-[1.02] tracking-tight"
              style={{ fontSize: "clamp(2.25rem, 7vw, 5.75rem)" }}
            >
              Born from a Father's Vision.
              <span className="block text-bansal-orange mt-2">
                Carried by a Family's Promise.
              </span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-white/85 leading-relaxed max-w-2xl">
              Shri <strong className="text-white">V.K. Bansal</strong> founded Bansal Classes in 1981 with one belief — that every aspirant deserves <em>ideal guidance</em>. Four decades on, he remains the soul of every classroom that bears his name.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/about/vk-bansal">
                <BansalButton variant="cta">
                  Read His Full Story <ArrowRight className="h-4 w-4" />
                </BansalButton>
              </Link>
              <Link to="/centers">
                <BansalButton variant="ghost-white">Visit a Centre</BansalButton>
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-4 right-6 z-10 hidden md:flex items-center gap-2 text-white/60 text-xs uppercase tracking-widest animate-pulse">
          Scroll <ChevronDown className="h-4 w-4" />
        </div>
      </section>

      {/* ============= PULL-QUOTE BAND ============= */}
      <section className={`relative bg-bansal-cream ${SECTION} overflow-hidden`}>
        <Quote className="absolute -top-6 left-4 md:left-12 h-40 w-40 text-bansal-orange/10" strokeWidth={1} />
        <div className={`${CONTAINER} max-w-4xl relative`}>
          <blockquote className="font-display italic text-2xl md:text-4xl lg:text-5xl font-semibold text-bansal-blue leading-[1.15] tracking-tight">
            &ldquo;Believe in yourself and strive for excellence with unwavering dedication. Success comes to those who persevere through challenges with a positive mindset and a thirst for knowledge.&rdquo;
          </blockquote>
          <div className="mt-8 flex items-center gap-3">
            <span className="h-px w-10 bg-bansal-orange" />
            <span className="text-bansal-orange uppercase tracking-[0.2em] text-xs font-bold">
              V.K. Bansal · Founder
            </span>
          </div>
        </div>
      </section>

      {/* ============= STATS STRIP ============= */}
      <section className="bg-white py-10 md:py-12 border-b border-border">
        <div className={`${CONTAINER} max-w-6xl grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8`}>
          {liveStats.map((s) => (
            <BansalStat key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </section>

      {/* ============= HISTORY ============= */}
      <section className={SECTION}>
        <div className={`${CONTAINER} max-w-4xl`}>
          <Eyebrow>Our Story</Eyebrow>
          <h2 className="font-display text-3xl md:text-5xl font-extrabold text-bansal-blue mb-6 tracking-tight">
            From a Single Classroom in Kota to a Pan-India Legacy
          </h2>
          <div className="space-y-4 text-base md:text-lg text-bansal-gray leading-relaxed">
            <p>
              Mr. <strong>V.K. Bansal</strong> was born on 26 October 1949, in the Jhansi district of Uttar Pradesh. After graduating from the Indian Institute of Technology, Banaras Hindu University, he worked at J. K. Synthetics, a chemical company in Kota.
            </p>
            <p>
              In 1981, he recognised the need to provide proper guidance to JEE aspirants and dedicated himself to this cause. With his dedication and positive attitude, Bansal Classes produced wonderful results year after year — each batch challenging the next to perform even better.
            </p>
            <p>
              Accepting change and creating strategies accordingly is the quality of a true leader — and this is exactly what Bansal Classes has been doing for four decades: <em>adopting the methods that best suit our students to crack the JEE</em>.
            </p>
          </div>
        </div>
      </section>

      {/* ============= TEACHING METHODOLOGY ============= */}
      <section className={`${SECTION} bg-bansal-cream/40`}>
        <div className={`${CONTAINER} max-w-6xl`}>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Eyebrow className="justify-center">Teaching Methodology</Eyebrow>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-bansal-blue tracking-tight">
              Every student learns differently
            </h2>
            <p className="text-bansal-gray mt-4 text-base md:text-lg">
              We incorporate a variety of teaching techniques to cater to diverse learning styles through these programs:
            </p>
          </div>
          <div className="grid gap-6 md:gap-8 md:grid-cols-3">
            {teachingMethodology.map((t) => (
              <BansalCard key={t.title} className="h-full">
                <BookOpen className="h-8 w-8 text-bansal-orange mb-3" />
                <h3 className="font-display text-lg font-bold text-bansal-blue mb-2">{t.title}</h3>
                <p className="text-sm text-bansal-gray leading-relaxed">{t.desc}</p>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* ============= VISION & MISSION ============= */}
      <section className={SECTION}>
        <div className={`${CONTAINER} max-w-6xl`}>
          <div className="grid gap-6 md:gap-8 md:grid-cols-2">
            <BansalCard className="h-full">
              <div className="flex items-center gap-3 mb-3">
                <Eye className="h-7 w-7 text-bansal-orange" />
                <h3 className="font-display text-2xl font-bold text-bansal-blue">Vision</h3>
              </div>
              <p className="italic text-bansal-gray mb-4">
                "Leadership is the capacity to translate vision into reality."
              </p>
              <p className="text-sm md:text-base text-bansal-gray mb-5 leading-relaxed">
                As leaders in the field of informal education, we are dedicated to enriching lives by challenging students to become successful, lifelong learners who thrive in a diverse and ever-changing world.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-bansal-blue font-medium">
                {visionPoints.map((v) => (
                  <li key={v} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-bansal-orange shrink-0" /> {v}
                  </li>
                ))}
              </ul>
            </BansalCard>

            <BansalCard className="h-full">
              <div className="flex items-center gap-3 mb-3">
                <Target className="h-7 w-7 text-bansal-orange" />
                <h3 className="font-display text-2xl font-bold text-bansal-blue">Mission</h3>
              </div>
              <p className="italic text-bansal-gray mb-4">
                "Innovation distinguishes between a leader and a follower."
              </p>
              <p className="text-sm md:text-base text-bansal-gray mb-5 leading-relaxed">
                Our objective is to ensure that all students have equal opportunities to excel in competitive examinations — by adopting the latest changes in JEE & NEET patterns and delivering quality teaching at every step.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-bansal-blue font-medium">
                {missionPoints.map((v) => (
                  <li key={v} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-bansal-orange shrink-0" /> {v}
                  </li>
                ))}
              </ul>
            </BansalCard>
          </div>
        </div>
      </section>

      {/* ============= LEADERSHIP ============= */}
      <section className={`${SECTION} bg-bansal-cream`}>
        <div className={`${CONTAINER} max-w-6xl`}>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Eyebrow className="justify-center">Our Leadership</Eyebrow>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold text-bansal-blue tracking-tight">
              Meet the visionaries behind our mission
            </h2>
          </div>
          <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {leadership.map((l) => (
              <Link key={l.slug} to={`/about/${l.slug}`} className="group block h-full">
                <BansalCard className="text-center h-full p-0 overflow-hidden hover:-translate-y-1 transition-transform duration-300">
                  <div className="aspect-[3/4] w-full overflow-hidden bg-bansal-cream flex items-center justify-center">
                    <img
                      src={l.photo}
                      alt={l.name}
                      className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-lg font-bold text-bansal-blue">{l.name}</h3>
                    <p className="text-xs text-bansal-orange font-semibold uppercase mt-1 tracking-wide">{l.role}</p>
                    <p className="text-xs text-bansal-gray mt-2 leading-relaxed">{l.tagline}</p>
                    <span className="inline-flex items-center gap-1 mt-4 text-xs font-semibold text-bansal-blue group-hover:text-bansal-orange transition-colors">
                      Read more <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </BansalCard>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============= CTA FOOTER ============= */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-bansal-blue to-bansal-blue-dark text-white">
        <div className={`${CONTAINER} max-w-3xl text-center`}>
          <h2 className="font-display text-2xl md:text-4xl font-extrabold mb-3">Join the Bansal Family</h2>
          <p className="text-white/85 mb-8">Talk to our admissions team or visit your nearest center.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/contact"><BansalButton variant="cta">Enquire Now</BansalButton></Link>
            <Link to="/centers"><BansalButton variant="ghost-white">Find a Centre</BansalButton></Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
