import { Link, useParams, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  Quote,
  Loader2,
  Calendar,
  Compass,
  BookOpen,
  Award as AwardIcon,
  Newspaper,
} from "lucide-react";
import BansalBadge from "@/components/bansal/BansalBadge";
import BansalButton from "@/components/bansal/BansalButton";
import { leadershipPhotos } from "@/content/bansal/about";
import { leaderEditorial, sameerBooks } from "@/content/bansal/leaderEditorial";
import { useLeader } from "@/hooks/useSiteContent";
import vkHeroBg from "@/assets/leader-hero/vk-bansal-hero-bg.png.asset.json";
import sameerHeroBg from "@/assets/leader-hero/sameer-bansal-hero-bg.png.asset.json";
import neelamHeroBg from "@/assets/leader-hero/neelam-bansal-hero-bg.png.asset.json";
import mahimaHeroBg from "@/assets/leader-hero/mahima-bansal-hero-bg.png.asset.json";
import vkProfilePhoto from "@/assets/leader-portraits/vk-bansal-latest.png.asset.json";
import sameerProfilePhoto from "@/assets/leader-portraits/sameer-bansal-latest-v2.png.asset.json";
import neelamProfilePhoto from "@/assets/leader-portraits/neelam-bansal-latest-v2.png.asset.json";
import mahimaProfilePhoto from "@/assets/leader-portraits/mahima-bansal-latest-v2.png.asset.json";
import wsjFeatureAsset from "@/assets/about/wsj-feature.jpg.asset.json";

const LEADER_HERO_BG: Record<string, string> = {
  "vk-bansal": vkHeroBg.url,
  "sameer-bansal": sameerHeroBg.url,
  "neelam-bansal": neelamHeroBg.url,
  "mahima-bansal": mahimaHeroBg.url,
};

const LEADER_PROFILE_PHOTO: Record<string, string> = {
  "vk-bansal": vkProfilePhoto.url,
  "sameer-bansal": sameerProfilePhoto.url,
  "neelam-bansal": neelamProfilePhoto.url,
  "mahima-bansal": mahimaProfilePhoto.url,
};

const HONORIFIC: Record<string, string> = {
  "vk-bansal": "Sir",
  "sameer-bansal": "Sir",
  "mahima-bansal": "Ma'am",
  "neelam-bansal": "Ma'am",
};

const SECTION = "py-16 md:py-24";
const CONTAINER = "container mx-auto px-4 sm:px-6 lg:px-8";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="h-px w-12 bg-bansal-orange" />
      <span className="text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold">
        {children}
      </span>
    </div>
  );
}

export default function LeadershipDetailPage() {
  const { slug = "" } = useParams();
  const { profile, sections, loading } = useLeader(slug);
  const extra = leaderEditorial[slug];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-bansal-orange" />
      </div>
    );
  }
  if (!profile) return <Navigate to="/about" replace />;

  const portrait = LEADER_PROFILE_PHOTO[slug] || profile.hero_photo_url || leadershipPhotos[slug];
  const heroBg = LEADER_HERO_BG[slug] || portrait;
  const nameParts = profile.name.split(" ");
  const firstName = nameParts.slice(0, -1).join(" ");
  const lastName = nameParts[nameParts.length - 1];
  const honorific = HONORIFIC[slug] ?? "";
  const displayFirst = honorific ? `${firstName || profile.name} ${honorific}` : (firstName || profile.name);

  return (
    <div className="bg-background">
      {/* ============= HERO (uniform across all leaders) ============= */}
      <section className="relative w-full min-h-[88vh] md:min-h-[80vh] flex items-end md:items-center overflow-hidden bg-bansal-blue-dark">
        {/* Background image — anchored top on mobile (face visible), right on desktop */}
        <img
          src={heroBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-[80%_top] md:object-[75%_center]"
        />
        {/* Mobile: bottom-up tint only (keeps photo clearly visible up top) */}
        <div className="absolute inset-0 md:hidden bg-gradient-to-t from-bansal-blue-dark via-bansal-blue-dark/85 via-35% to-transparent" />
        {/* Desktop: left-weighted brand tint for legible text */}
        <div className="absolute inset-0 hidden md:block bg-gradient-to-r from-bansal-blue-dark via-bansal-blue-dark/80 via-40% to-bansal-blue-dark/10" />
        <div className="absolute inset-0 hidden md:block bg-gradient-to-t from-bansal-blue-dark/70 via-transparent to-bansal-blue-dark/30" />
        <div className="absolute -right-32 -top-32 h-[24rem] w-[24rem] rounded-full bg-bansal-orange/15 blur-3xl pointer-events-none hidden md:block" />

        {/* Back link */}
        <div className="absolute top-0 inset-x-0 z-10">
          <div className={`${CONTAINER} pt-6`}>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-white/85 hover:text-bansal-orange text-sm font-medium backdrop-blur-sm bg-bansal-blue-dark/40 border border-white/15 px-3 py-1.5 rounded-full transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to About
            </Link>
          </div>
        </div>

        {/* Content — pinned to bottom on mobile, centered on desktop */}
        <div className={`relative z-10 w-full ${CONTAINER} pb-10 pt-32 md:py-24`}>
          <div className="max-w-3xl mx-auto md:mx-0 text-center md:text-left animate-fade-in">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-5">
              <span className="h-px w-12 bg-bansal-orange" />
              <span className="text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold">
                {profile.title}
              </span>
            </div>
            <h1
              className="font-display font-extrabold text-white leading-[1.05] tracking-tight whitespace-nowrap"
              style={{ fontSize: "clamp(1.75rem, 5.2vw, 4.5rem)" }}
            >
              {slug === "vk-bansal" ? (
                <>
                  <span className="text-bansal-orange">Bansal</span>{" "}
                  <span className="text-white">Sir</span>
                </>
              ) : (
                <>
                  {firstName && <span className="text-white">{firstName} </span>}
                  <span className="text-bansal-orange">{lastName}</span>
                  {honorific && (
                    <span className="ml-3 align-baseline text-white/85 font-bold" style={{ fontSize: "0.55em" }}>
                      {honorific}
                    </span>
                  )}
                </>
              )}
            </h1>
            {profile.headline && (
              <p className="mt-6 text-base md:text-lg text-white/85 font-medium leading-relaxed">
                {profile.headline}
              </p>
            )}
            {(profile.tags ?? []).length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-6">
                {(profile.tags ?? []).map((t) => (
                  <BansalBadge key={t} tone="orange">
                    {t}
                  </BansalBadge>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============= V.K. identity ribbon ============= */}
      {slug === "vk-bansal" && (
        <section className="bg-bansal-blue text-white py-5 border-b-2 border-bansal-orange/40">
          <div className={`${CONTAINER} max-w-6xl`}>
            <p className="font-display text-base md:text-xl font-semibold text-center md:text-left leading-snug">
              <span className="text-bansal-orange">Bansal Sir</span>
              <span className="mx-2 text-white/40">—</span>
              Founder, Bansal Classes
              <span className="mx-2 text-white/40">·</span>
              The Architect of Kota (since 1981)
            </p>
          </div>
        </section>
      )}

      {/* ============= PROFILE: photo + intro/quote ============= */}
      <section className={SECTION}>
        <div className={`${CONTAINER} max-w-6xl`}>
          <div className="grid gap-10 md:gap-12 md:grid-cols-12 items-center">
            {/* Portrait */}
            <div className="md:col-span-5">
              <div className="relative mx-auto md:mx-0 max-w-sm md:max-w-none">
                <div className="absolute -inset-3 rounded-3xl bg-bansal-orange/15 blur-2xl pointer-events-none" />
                <div className="relative aspect-[4/5] overflow-hidden rounded-3xl ring-1 ring-bansal-blue/10 shadow-2xl bg-bansal-cream">
                  <img
                    src={portrait}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 hidden md:block h-24 w-24 rounded-2xl border-4 border-bansal-orange/40" />
              </div>
            </div>

            {/* Text */}
            <div className="md:col-span-7">
              <Eyebrow>About {slug === "vk-bansal" ? "Bansal Sir" : slug === "sameer-bansal" ? "Sameer Bansal Sir" : slug === "neelam-bansal" ? "Neelam Bansal Ma'am" : slug === "mahima-bansal" ? "Mahima Bansal Ma'am" : displayFirst}</Eyebrow>
              {profile.pull_quote && (
                <blockquote className="relative font-display italic text-xl md:text-3xl font-semibold text-bansal-blue leading-[1.25] tracking-tight mb-6">
                  <Quote
                    className="absolute -top-3 -left-1 h-8 w-8 text-bansal-orange/30"
                    strokeWidth={1.5}
                  />
                  <span className="relative pl-6">
                    &ldquo;{profile.pull_quote}&rdquo;
                  </span>
                </blockquote>
              )}
              {profile.intro && (
                <p className="text-base md:text-lg text-bansal-gray leading-relaxed first-letter:font-display first-letter:text-5xl md:first-letter:text-6xl first-letter:font-bold first-letter:text-bansal-orange first-letter:float-left first-letter:mr-3 first-letter:leading-none first-letter:mt-1">
                  {slug === "vk-bansal"
                    ? profile.intro.replace(/V\s*K\.?\s*Bansal/g, "Bansal Sir")
                    : slug === "sameer-bansal"
                      ? profile.intro.replace(/Sameer Bansal\b(?!\s+Sir)/g, "Sameer Bansal Sir")
                      : slug === "neelam-bansal"
                        ? profile.intro.replace(/Mrs\.\s*/g, "").replace(/Neelam Bansal\b(?!\s+Ma'am)/g, "Neelam Bansal Ma'am")
                        : slug === "mahima-bansal"
                          ? profile.intro.replace(/Mahima Bansal\b(?!\s+Ma'am)/g, "Mahima Bansal Ma'am")
                          : profile.intro}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============= SAMEER: credential ribbon + Books (right after About) ============= */}
      {slug === "sameer-bansal" && (
        <>
          <section className="bg-bansal-blue text-white py-10">
            <div className={`${CONTAINER} max-w-6xl`}>
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="shrink-0 mx-auto md:mx-0 inline-flex items-center justify-center h-16 w-16 rounded-full bg-bansal-orange/20 ring-2 ring-bansal-orange/40">
                  <AwardIcon className="h-7 w-7 text-bansal-orange" />
                </div>
                <p className="font-display text-base md:text-2xl font-semibold leading-relaxed text-center md:text-left">
                  <span className="text-bansal-orange">Author of 4 best-selling JEE preparation books</span>
                  <span className="mx-2 text-white/40">·</span>
                  Mentor of <span className="text-bansal-orange">All India Rank 1</span> and{" "}
                  <span className="text-bansal-orange">single-digit ranks</span> several times.
                </p>
              </div>
            </div>
          </section>

          <section className={`${SECTION} bg-bansal-cream`}>
            <div className={`${CONTAINER} max-w-6xl`}>
              <div className="flex items-center gap-3 mb-4">
                <BookOpen className="h-5 w-5 text-bansal-orange" />
                <span className="text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold">
                  Authored Library
                </span>
              </div>
              <h2 className="font-display text-3xl md:text-5xl font-extrabold text-bansal-blue mb-3 tracking-tight">
                Books by Sameer Bansal Sir
              </h2>
              <p className="text-bansal-gray max-w-2xl mb-10">
                A four-volume problem-solving series read by JEE aspirants across India — written from a quarter-century inside the classroom.
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {sameerBooks.map((b) => (
                  <Link
                    key={b.title}
                    to="/e-store"
                    className="group h-full rounded-2xl bg-white border border-bansal-blue/10 p-4 hover:border-bansal-orange/40 hover:-translate-y-1 transition-all shadow-sm hover:shadow-xl block"
                  >
                    <div className="aspect-[2/3] overflow-hidden rounded-xl bg-gradient-to-br from-bansal-cream to-bansal-blue/5 mb-4 flex items-center justify-center p-3">
                      <img
                        src={b.cover}
                        alt={`${b.title} cover`}
                        loading="lazy"
                        className="max-h-full max-w-full object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="font-display text-lg font-extrabold text-bansal-blue leading-tight">
                      {b.title}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-bansal-orange uppercase tracking-wide">
                      {b.subtitle}
                    </div>
                    <div className="mt-2 text-[11px] text-bansal-gray">{b.edition}</div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ============= WALL STREET JOURNAL FEATURE (Bansal Sir only) ============= */}
      {slug === "vk-bansal" && (
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
                  A front-page Wall Street Journal feature on how Kota — and the man behind it, Bansal Sir — transformed Indian competitive education. A story read across the world.
                </p>
                <div className="mt-6 flex flex-wrap gap-6 text-sm">
                  <div>
                    <div className="font-display text-2xl font-extrabold text-bansal-orange">40,000+</div>
                    <div className="text-white/70 uppercase tracking-wider text-xs">Students in Kota</div>
                  </div>
                  <div>
                    <div className="font-display text-2xl font-extrabold text-bansal-orange">85+</div>
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
                    alt="Wall Street Journal feature on Bansal Sir and Kota coaching"
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
      )}


      {/* ============= CHAPTERS ============= */}
      {sections.length > 0 && (
        <section className={`${SECTION} bg-bansal-cream/40`}>
          <div className={`${CONTAINER} max-w-5xl`}>
            <Eyebrow>The Chapters</Eyebrow>
            <div className="divide-y divide-bansal-blue/10">
              {sections.map((s, i) => (
                <article
                  key={s.id}
                  className="grid md:grid-cols-12 gap-6 md:gap-10 py-10 md:py-14 group"
                >
                  <div className="md:col-span-3">
                    <div className="font-display text-5xl md:text-7xl font-extrabold text-bansal-orange/90 leading-none">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="mt-3 h-1 w-12 bg-bansal-blue/20 group-hover:bg-bansal-orange transition-colors" />
                  </div>
                  <div className="md:col-span-9">
                    <h3 className="font-display text-2xl md:text-3xl font-bold text-bansal-blue mb-3 tracking-tight">
                      {s.heading}
                    </h3>
                    <p className="text-base md:text-lg text-bansal-gray leading-relaxed whitespace-pre-line">
                      {s.body}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============= TIMELINE ============= */}
      {extra && (
        <section className={`${SECTION} bg-bansal-cream`}>
          <div className={`${CONTAINER} max-w-5xl`}>
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-5 w-5 text-bansal-orange" />
              <span className="text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold">
                Timeline
              </span>
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold text-bansal-blue mb-12 tracking-tight">
              {extra.timelineHeading}
            </h2>
            <div className="relative">
              <span className="absolute left-3 lg:left-1/2 top-0 bottom-0 w-px bg-bansal-blue/15" />
              <div className="space-y-10 lg:space-y-14">
                {extra.timeline.map((t, i) => (
                  <div
                    key={i}
                    className={`relative lg:grid lg:grid-cols-2 lg:gap-12 ${
                      i % 2 === 0 ? "" : "lg:[&>div:first-child]:order-2"
                    }`}
                  >
                    <span className="absolute left-3 lg:left-1/2 -translate-x-1/2 mt-2 h-3 w-3 rounded-full bg-bansal-orange ring-4 ring-bansal-cream" />
                    <div
                      className={`pl-10 lg:pl-0 ${
                        i % 2 === 0 ? "lg:pr-10 lg:text-right" : "lg:pl-10"
                      }`}
                    >
                      <div className="font-display text-3xl md:text-4xl font-extrabold text-bansal-blue">
                        {t.year}
                      </div>
                    </div>
                    <div
                      className={`pl-10 lg:pl-0 mt-2 lg:mt-0 ${
                        i % 2 === 0 ? "lg:pl-10" : "lg:pr-10 lg:text-right"
                      }`}
                    >
                      <h3 className="font-display text-xl md:text-2xl font-bold text-bansal-blue mb-2">
                        {t.title}
                      </h3>
                      <p className="text-bansal-gray leading-relaxed">{t.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============= PILLARS / PHILOSOPHY ============= */}
      {extra && (
        <section className={SECTION}>
          <div className={`${CONTAINER} max-w-6xl`}>
            <div className="flex items-center gap-3 mb-4">
              <Compass className="h-5 w-5 text-bansal-orange" />
              <span className="text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold">
                Philosophy
              </span>
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold text-bansal-blue mb-12 tracking-tight max-w-3xl">
              {extra.pillarsHeading}
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {extra.pillars.map((p, i) => (
                <div
                  key={p.title}
                  className="h-full relative rounded-2xl border border-bansal-blue/10 bg-bansal-cream/40 p-7 hover:border-bansal-orange/40 hover:-translate-y-1 transition-all"
                >
                  <div className="font-display text-5xl font-extrabold text-bansal-orange/30 leading-none">
                    0{i + 1}
                  </div>
                  <h3 className="font-display text-xl font-bold text-bansal-blue mt-3 mb-2">
                    {p.title}
                  </h3>
                  <p className="text-bansal-gray leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
            <p className="font-display italic text-lg md:text-xl text-bansal-blue/80 mt-12 max-w-3xl border-l-4 border-bansal-orange pl-6">
              {extra.closingNote}
            </p>
          </div>
        </section>
      )}

      {/* ============= RECOGNITION ============= */}
      {profile.recognition_text && (
        <section className={SECTION}>
          <div className={`${CONTAINER} max-w-4xl`}>
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
                <p className="font-display text-xl md:text-2xl leading-relaxed text-white/95 whitespace-pre-line">
                  {slug === "vk-bansal"
                    ? profile.recognition_text.replace(/V\s*\.?\s*K\.?\s*Bansal/gi, "Bansal Sir")
                    : slug === "mahima-bansal"
                      ? profile.recognition_text.replace(/Mahima Bansal\b(?!\s+Ma'am)/g, "Mahima Bansal Ma'am")
                      : profile.recognition_text}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============= SAMEER: V.K. continuity ============= */}
      {slug === "sameer-bansal" && (
        <>

          <section className={SECTION}>
            <div className={`${CONTAINER} max-w-5xl`}>
              <div className="grid gap-8 md:grid-cols-[auto_1fr] items-center rounded-3xl border border-bansal-blue/10 bg-gradient-to-br from-bansal-cream/60 to-white p-6 md:p-10">
                <Link
                  to="/about/vk-bansal"
                  className="shrink-0 mx-auto md:mx-0 block"
                >
                  <div className="h-32 w-32 md:h-40 md:w-40 rounded-2xl overflow-hidden ring-4 ring-bansal-orange/20 shadow-xl">
                    <img
                      src={vkProfilePhoto.url}
                      alt="Bansal Sir"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </Link>
                <div className="text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                    <span className="h-px w-8 bg-bansal-orange" />
                    <span className="text-bansal-orange uppercase tracking-[0.25em] text-[11px] font-bold">
                      Continuing the legacy
                    </span>
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl font-extrabold text-bansal-blue leading-tight">
                    In continuation of{" "}
                    <span className="text-bansal-orange">Mr. Bansal Sir</span>
                  </h3>
                  <p className="mt-3 text-bansal-gray leading-relaxed">
                    Every classroom, every test, every blackboard carries forward
                    the standard that Bansal Sir set in 1981. Sameer Sir's
                    leadership is the next chapter of the same teaching tradition
                    that built Kota.
                  </p>
                  <Link
                    to="/about/vk-bansal"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-bansal-orange hover:text-bansal-blue transition-colors"
                  >
                    Read about Bansal Sir{" "}
                    <ArrowLeft className="h-4 w-4 rotate-180" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ============= CTA FOOTER ============= */}
      <section className="bg-gradient-to-br from-bansal-blue to-bansal-blue-dark text-white py-16 md:py-20">
        <div className={`${CONTAINER} max-w-3xl text-center`}>
          <h2 className="font-display text-2xl md:text-4xl font-extrabold mb-3">
            Continue the Bansal Journey
          </h2>
          <p className="text-white/80 mb-8">
            Inspired by {slug === "vk-bansal" ? "Bansal Sir" : slug === "sameer-bansal" ? "Sameer Bansal Sir" : slug === "neelam-bansal" ? "Neelam Bansal Ma'am" : slug === "mahima-bansal" ? "Mahima Bansal Ma'am" : displayFirst}? Talk to our admissions team
            or explore more of the family.
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
