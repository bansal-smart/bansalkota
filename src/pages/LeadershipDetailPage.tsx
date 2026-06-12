import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Quote, ChevronDown, Loader2, Sparkles, Calendar, Compass, BookOpen, Award as AwardIcon } from "lucide-react";
import BansalBadge from "@/components/bansal/BansalBadge";
import BansalButton from "@/components/bansal/BansalButton";
import { leadershipPhotos } from "@/content/bansal/about";
import { leaderEditorial, sameerBooks } from "@/content/bansal/leaderEditorial";
import { useLeader } from "@/hooks/useSiteContent";
import vkPortrait from "@/assets/vk-bansal-portrait.jpg.asset.json";

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

  const initials = profile.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const photo = extra?.heroPhotoOverride || profile.hero_photo_url || leadershipPhotos[slug];
  const nameParts = profile.name.split(" ");
  const firstName = nameParts.slice(0, -1).join(" ");
  const lastName = nameParts[nameParts.length - 1];

  return (
    <div className="bg-background">
      {/* CINEMATIC FULL-BLEED HERO */}
      <section className="relative w-full min-h-[70vh] md:min-h-[90vh] overflow-hidden bg-bansal-blue-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-bansal-blue-dark via-bansal-blue to-bansal-orange-dark flex items-center justify-center">
          <span className="font-display text-[20rem] font-extrabold text-white/10 leading-none select-none">
            {initials}
          </span>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-bansal-blue-dark via-bansal-blue-dark/70 via-40% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-bansal-blue-dark/80 via-bansal-blue-dark/20 to-transparent" />
        <div className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-bansal-orange/25 blur-3xl pointer-events-none" />

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

        <div className="absolute inset-x-0 bottom-0 z-10">
          <div className="container mx-auto px-4 sm:px-6 pb-12 md:pb-20">
            <div className="max-w-4xl animate-fade-in">
              <div className="flex items-center gap-3 mb-5">
                <span className="h-px w-12 bg-bansal-orange" />
                <span className="text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold">
                  {profile.title}
                </span>
              </div>
              <h1
                className="font-display font-extrabold text-white leading-[0.9] tracking-tight"
                style={{ fontSize: "clamp(2.75rem, 9vw, 7.5rem)" }}
              >
                {firstName && <span className="block">{firstName}</span>}
                <span className="block text-bansal-orange">{lastName}</span>
              </h1>
              {profile.headline && (
                <p className="mt-5 max-w-2xl text-base md:text-lg text-white/85 font-medium">
                  {profile.headline}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-6">
                {(profile.tags ?? []).map((t) => (
                  <BansalBadge key={t} tone="orange">{t}</BansalBadge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 right-6 z-10 hidden md:flex items-center gap-2 text-white/60 text-xs uppercase tracking-widest animate-pulse">
          Scroll <ChevronDown className="h-4 w-4" />
        </div>
      </section>

      {/* ===== V.K. BANSAL: PERSISTENT IDENTITY RIBBON ===== */}
      {slug === "vk-bansal" && (
        <section className="bg-bansal-blue text-white py-5 border-b-2 border-bansal-orange/40">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <p className="font-display text-base md:text-xl font-semibold text-center md:text-left leading-snug">
              <span className="text-bansal-orange">Mr. V.K. Bansal Sir</span>
              <span className="mx-2 text-white/40">—</span>
              Founder, Bansal Classes
              <span className="mx-2 text-white/40">·</span>
              The Architect of Kota (since 1981)
            </p>
          </div>
        </section>
      )}


      {/* PULL-QUOTE BAND */}
      {profile.pull_quote && (
        <section className="relative bg-bansal-cream py-16 md:py-20 overflow-hidden">
          <Quote className="absolute -top-6 left-4 md:left-12 h-40 w-40 text-bansal-orange/10" strokeWidth={1} />
          <div className="container mx-auto px-4 sm:px-6 max-w-4xl relative">
            <blockquote className="font-display italic text-2xl md:text-4xl lg:text-5xl font-semibold text-bansal-blue leading-[1.15] tracking-tight">
              &ldquo;{profile.pull_quote}&rdquo;
            </blockquote>
            <div className="mt-8 flex items-center gap-3">
              <span className="h-px w-10 bg-bansal-orange" />
              <span className="text-bansal-orange uppercase tracking-[0.2em] text-xs font-bold">
                {profile.name}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* INTRO LEAD */}
      {profile.intro && (
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
            <p className="text-lg md:text-xl text-bansal-gray leading-relaxed first-letter:font-display first-letter:text-6xl first-letter:font-bold first-letter:text-bansal-orange first-letter:float-left first-letter:mr-3 first-letter:leading-none first-letter:mt-1">
              {profile.intro}
            </p>
          </div>
        </section>
      )}

      {/* EDITORIAL NUMBERED SECTIONS */}
      {sections.length > 0 && (
        <section className="pb-16 md:pb-24">
          <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
            <div className="flex items-center gap-3 mb-12">
              <span className="h-px w-12 bg-bansal-orange" />
              <span className="text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold">
                The Chapters
              </span>
            </div>
            <div className="divide-y divide-bansal-blue/10">
              {sections.map((s, i) => (
                <article key={s.id} className="grid md:grid-cols-12 gap-6 md:gap-10 py-10 md:py-14 group">
                  <div className="md:col-span-3">
                    <div className="font-display text-6xl md:text-7xl font-extrabold text-bansal-orange/90 leading-none">
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

      {/* RECOGNITION */}
      {profile.recognition_text && (
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
                <p className="font-display text-xl md:text-2xl leading-relaxed text-white/95 whitespace-pre-line">
                  {profile.recognition_text}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== UNIQUE PER-LEADER EDITORIAL ===== */}
      {extra && (
        <>
          {/* GALLERY MOSAIC */}
          {slug !== "neelam-bansal" && (
          <section className="bg-white pb-16 md:pb-24">
            <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
              <div className="flex items-end justify-between gap-6 mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="h-px w-10 bg-bansal-orange" />
                    <span className="text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold">
                      {extra.accentLabel}
                    </span>
                  </div>
                  <h2 className="font-display text-2xl md:text-4xl font-extrabold text-bansal-blue tracking-tight max-w-2xl">
                    {extra.galleryCaption}
                  </h2>
                </div>
                <Sparkles className="hidden md:block h-8 w-8 text-bansal-orange/60 shrink-0" />
              </div>
              <p className="font-display italic text-lg md:text-xl text-bansal-gray max-w-3xl mb-10">
                {extra.signatureLine}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[120px] md:auto-rows-[160px]">
                {extra.gallery.map((g, i) => (
                  <div
                    key={i}
                    className={`relative overflow-hidden rounded-xl group ${
                      g.tall ? "row-span-2 col-span-2 md:col-span-2" : ""
                    }`}
                  >
                    <img
                      src={g.src}
                      alt={g.alt}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bansal-blue-dark/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>
          </section>
          )}

          {/* TIMELINE */}
          <section className="bg-bansal-cream py-16 md:py-24">
            <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="h-5 w-5 text-bansal-orange" />
                <span className="text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold">
                  Timeline
                </span>
              </div>
              <h2 className="font-display text-3xl md:text-5xl font-extrabold text-bansal-blue mb-12 tracking-tight">
                {extra.timelineHeading}
              </h2>
              <div className="relative">
                <span className="absolute left-3 md:left-1/2 top-0 bottom-0 w-px bg-bansal-blue/15" />
                <div className="space-y-10 md:space-y-14">
                  {extra.timeline.map((t, i) => (
                    <div
                      key={i}
                      className={`relative md:grid md:grid-cols-2 md:gap-12 ${
                        i % 2 === 0 ? "" : "md:[&>div:first-child]:order-2"
                      }`}
                    >
                      <span className="absolute left-3 md:left-1/2 -translate-x-1/2 mt-2 h-3 w-3 rounded-full bg-bansal-orange ring-4 ring-bansal-cream" />
                      <div className={`pl-10 md:pl-0 ${i % 2 === 0 ? "md:pr-10 md:text-right" : "md:pl-10"}`}>
                        <div className="font-display text-3xl md:text-4xl font-extrabold text-bansal-blue">
                          {t.year}
                        </div>
                      </div>
                      <div className={`pl-10 md:pl-0 mt-2 md:mt-0 ${i % 2 === 0 ? "md:pl-10" : "md:pr-10 md:text-right"}`}>
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

          {/* PILLARS */}
          <section className="bg-white py-16 md:py-24">
            <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
              <div className="flex items-center gap-3 mb-3">
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
                    className="relative rounded-2xl border border-bansal-blue/10 bg-bansal-cream/40 p-7 hover:border-bansal-orange/40 hover:-translate-y-1 transition-all"
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
        </>
      )}

      {/* ===== SAMEER SIR: AUTHORED BOOKS + V.K. BANSAL CONTINUITY ===== */}
      {slug === "sameer-bansal" && (
        <>
          {/* Credential ribbon */}
          <section className="bg-bansal-blue text-white py-10">
            <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="shrink-0 inline-flex items-center justify-center h-16 w-16 rounded-full bg-bansal-orange/20 ring-2 ring-bansal-orange/40">
                  <AwardIcon className="h-7 w-7 text-bansal-orange" />
                </div>
                <p className="font-display text-lg md:text-2xl font-semibold leading-relaxed">
                  <span className="text-bansal-orange">Author of 4 best-selling JEE preparation books</span>
                  <span className="mx-2 text-white/40">·</span>
                  Mentor of <span className="text-bansal-orange">All India Rank 1</span> and{" "}
                  <span className="text-bansal-orange">single-digit ranks</span> several times.
                </p>

              </div>
            </div>
          </section>

          {/* Books grid */}
          <section className="bg-bansal-cream py-16 md:py-24">
            <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
              <div className="flex items-center gap-3 mb-3">
                <BookOpen className="h-5 w-5 text-bansal-orange" />
                <span className="text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold">
                  Authored Library
                </span>
              </div>
              <h2 className="font-display text-3xl md:text-5xl font-extrabold text-bansal-blue mb-3 tracking-tight">
                Books by Sameer Sir
              </h2>
              <p className="text-bansal-gray max-w-2xl mb-10">
                A four-volume problem-solving series read by JEE aspirants across India — written from a quarter-century inside the classroom.
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {sameerBooks.map((b) => (
                  <div key={b.title} className="group rounded-2xl bg-white border border-bansal-blue/10 p-4 hover:border-bansal-orange/40 hover:-translate-y-1 transition-all shadow-sm hover:shadow-xl">
                    <div className="aspect-[2/3] overflow-hidden rounded-xl bg-bansal-blue/5 mb-4">
                      <img
                        src={b.cover}
                        alt={`${b.title} cover`}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="font-display text-lg font-extrabold text-bansal-blue leading-tight">{b.title}</div>
                    <div className="mt-1 text-xs font-semibold text-bansal-orange uppercase tracking-wide">{b.subtitle}</div>
                    <div className="mt-2 text-[11px] text-bansal-gray">{b.edition}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* V.K. Bansal continuity */}
          <section className="bg-white py-16 md:py-24">
            <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
              <div className="grid gap-8 md:grid-cols-[auto_1fr] items-center rounded-3xl border border-bansal-blue/10 bg-gradient-to-br from-bansal-cream/60 to-white p-6 md:p-10">
                <Link to="/about/vk-bansal" className="shrink-0 mx-auto md:mx-0 block">
                  <div className="h-32 w-32 md:h-40 md:w-40 rounded-2xl overflow-hidden ring-4 ring-bansal-orange/20 shadow-xl">
                    <img src={vkPortrait.url} alt="V.K. Bansal Sir" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                </Link>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="h-px w-8 bg-bansal-orange" />
                    <span className="text-bansal-orange uppercase tracking-[0.25em] text-[11px] font-bold">
                      Continuing the legacy
                    </span>
                  </div>
                  <h3 className="font-display text-2xl md:text-3xl font-extrabold text-bansal-blue leading-tight">
                    In continuation of <span className="text-bansal-orange">Mr. V.K. Bansal Sir</span>
                  </h3>
                  <p className="mt-3 text-bansal-gray leading-relaxed">
                    Every classroom, every test, every blackboard carries forward the standard that V.K. Bansal Sir set in 1981.
                    Sameer Sir's leadership is the next chapter of the same teaching tradition that built Kota.
                  </p>
                  <Link to="/about/vk-bansal" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-bansal-orange hover:text-bansal-blue transition-colors">
                    Read about V.K. Bansal Sir <ArrowLeft className="h-4 w-4 rotate-180" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </>
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
