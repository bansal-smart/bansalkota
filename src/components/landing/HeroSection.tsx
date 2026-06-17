import type { FormConfig, HeroConfig } from "@/lib/landingSchemas";
import { Calendar, Users, Sparkles } from "lucide-react";
import CountdownTimer from "./CountdownTimer";
import LeadForm from "./LeadForm";

type Props = { hero: HeroConfig; formConfig: FormConfig };

export default function HeroSection({ hero, formConfig }: Props) {
  const bg = hero.banner_url;
  return (
    <section
      className="relative overflow-hidden border-b border-border"
      style={{
        background: bg
          ? `linear-gradient(rgba(15,23,42,0.78), rgba(15,23,42,0.85)), url(${bg}) center/cover no-repeat`
          : "linear-gradient(135deg, hsl(222,47%,11%) 0%, hsl(222,47%,18%) 100%)",
      }}
    >
      <div className="container mx-auto grid gap-10 px-4 py-12 lg:grid-cols-[1.4fr_1fr] lg:gap-12 lg:py-20">
        <div className="text-primary-foreground">
          <div className="flex flex-wrap items-center gap-2">
            {hero.seats_enabled && (hero.seats_left ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-destructive-foreground">
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                </span>
                Only {hero.seats_left} seats left
              </span>
            )}
            {hero.start_date && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                <Calendar className="h-3 w-3" /> {hero.start_date}
              </span>
            )}
          </div>

          <h1 className="mt-4 font-display text-4xl font-black leading-tight text-white lg:text-6xl">
            {hero.title || "Bansal Crash Course"}
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/80 lg:text-lg">
            {hero.subtitle}
          </p>

          {hero.early_bird_enabled && hero.early_bird_deadline && (
            <div className="mt-6 inline-flex flex-col gap-2 rounded-lg bg-primary/15 p-3 ring-1 ring-primary/40">
              <div className="flex items-center gap-2 text-sm font-bold text-primary">
                <Sparkles className="h-4 w-4" /> Early bird offer ends in
              </div>
              <CountdownTimer deadline={hero.early_bird_deadline} />
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#lead-form"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-7 text-base font-bold text-primary-foreground shadow-lg transition hover:scale-[1.02]"
            >
              {hero.cta_label || "Register Now"}
            </a>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <Users className="h-4 w-4" />
              <span>10,000+ students enrolled</span>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-6">
          <LeadForm config={formConfig} />
        </div>
      </div>
    </section>
  );
}
