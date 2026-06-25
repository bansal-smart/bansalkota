import { useEffect, useState } from "react";
import { Trophy, Medal, Star, TrendingUp, Building2 } from "lucide-react";
import BansalCard from "@/components/bansal/BansalCard";
import BansalBadge from "@/components/bansal/BansalBadge";
import BansalButton from "@/components/bansal/BansalButton";
import achievementsHeroAsset from "@/assets/achievements-hero.webp.asset.json";
const achievementsHero = achievementsHeroAsset.url;
import { FloatingIcons, DotTexture } from "@/components/bansal/BansalDecor";
import { useSitePage } from "@/hooks/useSitePage";
import { supabase } from "@/integrations/supabase/client";

type Poster = { id: string; image_url: string; caption: string };

const milestones = [
  { icon: Trophy, value: "330+", label: "AIR Top 100 in JEE Advanced 2025" },
  { icon: Medal, value: "5000+", label: "NEET Qualified" },
  { icon: Star, value: "25,000+", label: "IITians" },
  { icon: Building2, value: "85+", label: "Centres" },
];

export default function AchievementsPage() {
  const { page: cmsPage } = useSitePage("achievements");
  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("achievement_posters")
        .select("id, image_url, caption")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      setPosters((data as Poster[]) ?? []);
      setLoading(false);
    })();
  }, []);

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

      {/* Editable CMS intro */}
      {cmsPage?.content_html && (
        <section className="pb-6">
          <div className="container mx-auto px-4 max-w-3xl">
            <div
              className="prose prose-sm md:prose-base max-w-none prose-headings:font-display prose-headings:text-bansal-blue prose-a:text-bansal-orange"
              dangerouslySetInnerHTML={{ __html: cmsPage.content_html }}
            />
          </div>
        </section>
      )}

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
                    <div className="mb-4">
                      {t.rank_label && (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-bansal-orange/10 text-bansal-orange px-3 py-1 text-[11px] font-bold uppercase tracking-wider mb-3">
                          <Trophy className="h-3 w-3" /> {t.rank_label}
                        </div>
                      )}
                      <h3 className="font-display text-lg font-bold text-bansal-black leading-tight">{t.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wide">{t.exam}</p>
                    </div>



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
