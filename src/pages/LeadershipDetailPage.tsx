import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Quote, ChevronDown, Loader2, Sparkles, Calendar, Compass } from "lucide-react";
import BansalBadge from "@/components/bansal/BansalBadge";
import BansalButton from "@/components/bansal/BansalButton";
import { leadershipPhotos } from "@/content/bansal/about";
import { leaderEditorial } from "@/content/bansal/leaderEditorial";
import { useLeader } from "@/hooks/useSiteContent";

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
  const photo = profile.hero_photo_url || leadershipPhotos[slug];
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
