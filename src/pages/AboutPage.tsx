import { Link } from "react-router-dom";
import { ArrowRight, Eye, Target, BookOpen, Quote, Newspaper } from "lucide-react";
import BansalButton from "@/components/bansal/BansalButton";
import BansalCard from "@/components/bansal/BansalCard";
import BansalStat from "@/components/bansal/BansalStat";
import vkBansalPortraitAsset from "@/assets/leader-portraits/vk-bansal-latest.png.asset.json";
import heroBgAsset from "@/assets/about/about-hero-bg.png.asset.json";
import wsjFeatureAsset from "@/assets/about/wsj-feature.jpg.asset.json";
import wsjFullAsset from "@/assets/about/wsj-fullpage.png.asset.json";
import vkGehlotAsset from "@/assets/about/vk-with-gehlot.jpg.asset.json";
import {
  bansalStats,
  teachingMethodology,
  visionPoints,
  missionPoints,
  leadership,
} from "@/content/bansal/about";
import { useSiteStats } from "@/hooks/useSiteContent";

const vkBansalPortrait = vkBansalPortraitAsset.url;

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

  // Non-founder leaders (column section)
  const otherLeaders = leadership.filter((l) => l.slug !== "vk-bansal");

  return (
    <div className="bg-background">
      {/* ============= HERO ============= */}
      <section className="relative w-full min-h-[70vh] md:min-h-[85vh] flex items-end overflow-hidden bg-bansal-blue-dark">
        <img
          src={heroBgAsset.url}
          alt="Bansal Classes campus"
          className="absolute inset-0 w-full h-full object-cover object-center"
          loading="eager"
          // @ts-expect-error - fetchpriority is valid
          fetchpriority="high"
        />
        {/* Brand tint overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-bansal-blue-dark via-bansal-blue-dark/70 to-bansal-blue-dark/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-bansal-blue-dark/80 via-bansal-blue-dark/20 to-transparent" />

        <div className={`relative z-10 ${CONTAINER} pb-14 md:pb-20 pt-28`}>
          <div className="max-w-3xl">
            <Eyebrow>About Bansal Classes</Eyebrow>
            <h1
              className="font-display font-extrabold text-white leading-[1.05] tracking-tight"
              style={{ fontSize: "clamp(2rem, 6vw, 4.75rem)" }}
            >
              Forty Years of Shaping
              <span className="block text-bansal-orange">India's Brightest Minds.</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-white/85 leading-relaxed max-w-2xl">
              Founded in Kota in 1981 by Shri V.K. Bansal Sir, we built the institution that turned a town into a national symbol of academic excellence.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/centers">
                <BansalButton variant="cta">Visit a Centre <ArrowRight className="h-4 w-4" /></BansalButton>
              </Link>
              <Link to="/contact">
                <BansalButton variant="ghost-white">Talk to Admissions</BansalButton>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============= FOUNDER ============= */}
      <section className={SECTION}>
        <div className={`${CONTAINER} max-w-6xl`}>
          <div className="grid gap-10 md:gap-14 md:grid-cols-12 items-center">
            <div className="md:col-span-5">
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-bansal-cream shadow-xl">
                <img
                  src={vkBansalPortrait}
                  alt="Shri V.K. Bansal Sir — Founder"
                  className="absolute inset-0 w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="md:col-span-7">
              <Eyebrow>The Founder · 1949 – Forever Honored</Eyebrow>
              <h2 className="font-display text-3xl md:text-5xl font-extrabold text-bansal-blue tracking-tight leading-[1.1]">
                Shri V.K. Bansal Sir
              </h2>
              <p className="mt-2 text-bansal-orange font-semibold uppercase tracking-wide text-sm">
                Founder, Bansal Classes
              </p>
              <div className="mt-5 space-y-4 text-base md:text-lg text-bansal-gray leading-relaxed">
                <p>
                  Born on 26 October 1949 in Jhansi, Shri V.K. Bansal Sir graduated from IIT (BHU) Varanasi and moved to Kota to work at J.K. Synthetics. In <strong>1981</strong>, he began coaching a handful of students — and quietly created a movement that would redefine engineering education in India.
                </p>
                <p>
                  His belief was simple: every aspirant deserves <em>ideal guidance</em>. Four decades later, that belief remains the soul of every Bansal classroom.
                </p>
              </div>
              <div className="mt-7">
                <Link to="/about/vk-bansal">
                  <BansalButton variant="primary">
                    Read His Full Story <ArrowRight className="h-4 w-4" />
                  </BansalButton>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============= WALL STREET JOURNAL FEATURE ============= */}
      <section className={`${SECTION} bg-bansal-blue-dark text-white relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-bansal-blue-dark via-bansal-blue to-bansal-blue-dark" />
        <div className={`relative ${CONTAINER} max-w-6xl`}>
          <div className="grid gap-10 lg:gap-14 lg:grid-cols-12 items-center">
            <div className="lg:col-span-5 order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 bg-bansal-orange/15 border border-bansal-orange/40 text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold px-4 py-2 rounded-full mb-5">
                <Newspaper className="h-3.5 w-3.5" /> As Featured In
              </div>
              <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
                The Wall Street Journal
              </h2>
              <p className="mt-3 text-bansal-orange font-display italic text-xl md:text-2xl">
                "India's Cram-School Confidential — Bansalites Rock."
              </p>
              <p className="mt-5 text-white/85 leading-relaxed text-base md:text-lg max-w-xl">
                A front-page Wall Street Journal feature on how Kota — and the man behind it, V.K. Bansal Sir — transformed Indian competitive education. A story read across the world.
              </p>
              <div className="mt-6 flex flex-wrap gap-6 text-sm">
                <div>
                  <div className="font-display text-2xl font-extrabold text-bansal-orange">40,000+</div>
                  <div className="text-white/70 uppercase tracking-wider text-xs">Students in Kota</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-extrabold text-bansal-orange">100+</div>
                  <div className="text-white/70 uppercase tracking-wider text-xs">Coaching Schools</div>
                </div>
                <div>
                  <div className="font-display text-2xl font-extrabold text-bansal-orange">1 Legacy</div>
                  <div className="text-white/70 uppercase tracking-wider text-xs">Started It All</div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-7 order-1 lg:order-2">
              <div className="relative">
                <div className="absolute -inset-3 bg-bansal-orange/20 rounded-2xl blur-2xl" />
                <img
                  src={wsjFeatureAsset.url}
                  alt="Wall Street Journal feature on V.K. Bansal Sir and Kota coaching"
                  className="relative w-full rounded-xl shadow-2xl border-4 border-white/90"
                  loading="lazy"
                />
              </div>
              <p className="mt-4 text-center text-xs uppercase tracking-[0.25em] text-white/60">
                The Wall Street Journal · Front Page Feature
              </p>
            </div>
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
              V.K. Bansal Sir · Founder
            </span>
          </div>
        </div>
      </section>

      {/* ============= LEADERSHIP COLUMNS ============= */}
      <section className={SECTION}>
        <div className={`${CONTAINER} max-w-6xl`}>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Eyebrow className="justify-center">The Bansal Family</Eyebrow>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold text-bansal-blue tracking-tight">
              Carrying the legacy forward
            </h2>
            <p className="text-bansal-gray mt-4 text-base md:text-lg">
              The next generation of leaders shaping Bansal Classes today.
            </p>
          </div>
          <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {otherLeaders.map((l) => (
              <Link key={l.slug} to={`/about/${l.slug}`} className="group block h-full">
                <BansalCard className="h-full p-0 overflow-hidden hover:-translate-y-1 transition-transform duration-300 flex flex-col">
                  <div className="aspect-[4/5] w-full overflow-hidden bg-bansal-cream">
                    <img
                      src={l.photo}
                      alt={l.name}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-display text-xl font-bold text-bansal-blue">{l.name}</h3>
                    <p className="text-xs text-bansal-orange font-semibold uppercase mt-1 tracking-wider">{l.role}</p>
                    <p className="text-sm text-bansal-gray mt-3 leading-relaxed flex-1">{l.tagline}</p>
                    <span className="inline-flex items-center gap-1 mt-5 text-sm font-semibold text-bansal-blue group-hover:text-bansal-orange transition-colors">
                      Read more <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </BansalCard>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============= HISTORY + GEHLOT MOMENT ============= */}
      <section className={`${SECTION} bg-bansal-cream/40`}>
        <div className={`${CONTAINER} max-w-6xl`}>
          <div className="grid gap-10 md:gap-14 md:grid-cols-12 items-start">
            <div className="md:col-span-7">
              <Eyebrow>Our Story</Eyebrow>
              <h2 className="font-display text-3xl md:text-5xl font-extrabold text-bansal-blue mb-6 tracking-tight leading-[1.1]">
                From a single classroom in Kota to a pan-India legacy
              </h2>
              <div className="space-y-4 text-base md:text-lg text-bansal-gray leading-relaxed">
                <p>
                  In 1981, V.K. Bansal Sir recognised the need to provide proper guidance to JEE aspirants and dedicated himself to this cause. With his discipline and positive attitude, Bansal Classes produced remarkable results year after year — each batch challenging the next to perform even better.
                </p>
                <p>
                  Accepting change and creating strategies accordingly is the quality of a true leader — and that is exactly what Bansal Classes has been doing for four decades: <em>adopting the methods that best suit our students to crack the JEE</em>.
                </p>
              </div>
            </div>

            <div className="md:col-span-5">
              <figure className="rounded-xl overflow-hidden bg-white shadow-md border border-border">
                <img
                  src={vkGehlotAsset.url}
                  alt="Shri V.K. Bansal Sir with Shri Ashok Gehlot, former Chief Minister of Rajasthan"
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
                <figcaption className="p-4 text-xs text-bansal-gray border-t border-border">
                  Shri V.K. Bansal Sir in conversation with <strong className="text-bansal-blue">Shri Ashok Gehlot</strong>, former Chief Minister of Rajasthan.
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* ============= TEACHING METHODOLOGY ============= */}
      <section className={SECTION}>
        <div className={`${CONTAINER} max-w-6xl`}>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Eyebrow className="justify-center">Teaching Methodology</Eyebrow>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold text-bansal-blue tracking-tight">
              Every student learns differently
            </h2>
            <p className="text-bansal-gray mt-4 text-base md:text-lg">
              We incorporate a variety of teaching techniques to cater to diverse learning styles through these programs.
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
      <section className={`${SECTION} bg-bansal-cream/40`}>
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

      {/* ============= CTA FOOTER ============= */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-bansal-blue to-bansal-blue-dark text-white">
        <div className={`${CONTAINER} max-w-3xl text-center`}>
          <h2 className="font-display text-2xl md:text-4xl font-extrabold mb-3">Join the Bansal Family</h2>
          <p className="text-white/85 mb-8">Talk to our admissions team or visit your nearest centre.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/contact"><BansalButton variant="cta">Enquire Now</BansalButton></Link>
            <Link to="/centers"><BansalButton variant="ghost-white">Find a Centre</BansalButton></Link>
          </div>
        </div>
      </section>

      {/* Hidden: WSJ full-page archive ref kept for future modal */}
      <link rel="preload" as="image" href={wsjFullAsset.url} />
    </div>
  );
};

export default AboutPage;
