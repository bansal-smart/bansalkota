import { useMemo, useState } from "react";
import { Trophy, Medal, Star, Award, TrendingUp, Building2 } from "lucide-react";
import BansalCard from "@/components/bansal/BansalCard";
import BansalBadge from "@/components/bansal/BansalBadge";
import BansalButton from "@/components/bansal/BansalButton";
import achievementsHeroAsset from "@/assets/achievements-hero.webp.asset.json";
const achievementsHero = achievementsHeroAsset.url;
import { FloatingIcons, DotTexture, GlowBlob } from "@/components/bansal/BansalDecor";
import { useToppers, type Topper } from "@/hooks/useToppers";

const PAGE_SIZE = 24;

const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const milestones = [
  { icon: Trophy, value: "330+", label: "AIR Top 100 in JEE Advanced 2025" },
  { icon: Medal, value: "5000+", label: "NEET Qualified" },
  { icon: Star, value: "25,000+", label: "IITians" },
  { icon: Building2, value: "85+", label: "Centres" },
];

export default function AchievementsPage() {
  const { toppers, loading } = useToppers();
  const [filter, setFilter] = useState<string>("All");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const exams = useMemo(() => {
    const set = new Set<string>();
    toppers.forEach((t) => t.exam && set.add(t.exam));
    return ["All", ...Array.from(set)];
  }, [toppers]);

  const filtered = useMemo(() => {
    return filter === "All" ? toppers : toppers.filter((t) => t.exam === filter);
  }, [toppers, filter]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[hsl(var(--navy))] text-white py-14 md:py-20">
        <img
          src={achievementsHero}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--navy))]/85 via-[hsl(var(--navy2))]/75 to-[hsl(222,47%,15%)]/90" />
        <FloatingIcons defaultTone="white" />
        <DotTexture tone="white" className="opacity-30 decor-fade" />
        <div className="container relative z-10 mx-auto px-4 text-center max-w-3xl">
          <BansalBadge variant="orange" className="mb-4">
            Our Achievements
          </BansalBadge>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Toppers Born at <span className="text-bansal-orange">Bansal Classes</span>
          </h1>
          <p className="text-white/85 text-lg">
            Since 1981. Thousands of IIT &amp; NEET selections. Here are some of the recent stars who walked through our
            doors.
          </p>
        </div>
      </section>

      {/* Milestones */}
      <section className="py-14 -mt-10">
        <div className="container mx-auto px-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {milestones.map((m) => (
              <BansalCard key={m.label} className="text-center">
                <div className="h-12 w-12 mx-auto rounded-lg bg-bansal-orange/10 text-bansal-orange flex items-center justify-center mb-3">
                  <m.icon className="h-6 w-6" />
                </div>
                <div className="font-display text-3xl font-bold text-bansal-blue">{m.value}</div>
                <p className="text-xs text-muted-foreground mt-2">{m.label}</p>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* Toppers wall */}
      <section className="py-14">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <BansalBadge variant="blue" className="mb-3">
              Recent Toppers
            </BansalBadge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black">The Wall of Fame</h2>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {exams.map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setVisibleCount(PAGE_SIZE); }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  filter === f
                    ? "bg-bansal-blue text-white"
                    : "bg-bansal-blue-light text-bansal-blue hover:bg-bansal-blue hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No toppers to show yet.</p>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((t) => (
                  <BansalCard key={t.id} className="relative">
                    {t.year && (
                      <div className="absolute top-4 right-4">
                        <BansalBadge variant="orange">{t.year}</BansalBadge>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-4">
                      {t.photo_url ? (
                        <img
                          src={t.photo_url}
                          alt={t.name}
                          loading="lazy"
                          className="h-14 w-14 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-full bg-bansal-blue text-white font-display font-bold text-lg flex items-center justify-center">
                          {initialsFor(t.name)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-display text-lg font-bold text-bansal-black">{t.name}</h3>
                        <p className="text-xs text-muted-foreground">{t.exam}</p>
                      </div>
                    </div>
                    {t.rank_label && (
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy className="h-4 w-4 text-bansal-orange" />
                        <span className="font-display font-bold text-bansal-blue text-xl">{t.rank_label}</span>
                      </div>
                    )}
                    {t.quote && (
                      <p className="text-sm text-muted-foreground italic border-l-2 border-bansal-orange pl-3 leading-relaxed">
                        "{t.quote}"
                      </p>
                    )}
                  </BansalCard>
                ))}
              </div>
              {visibleCount < filtered.length && (
                <div className="text-center mt-10">
                  <BansalButton variant="outline" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                    Show more ({filtered.length - visibleCount} remaining)
                  </BansalButton>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-bansal-blue text-white">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <TrendingUp className="h-12 w-12 text-bansal-orange mx-auto mb-4" />
          <h2 className="font-display text-3xl font-bold mb-3">Be the next name on this wall.</h2>
          <p className="text-white/80 mb-6">
            Start your journey with India's most trusted JEE/NEET coaching. Win up to 90% scholarship via BOOST.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="/boost">
              <BansalButton variant="cta">Register for BOOST</BansalButton>
            </a>
            <a href="/contact">
              <BansalButton variant="ghost-white">Talk to Counsellor</BansalButton>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
