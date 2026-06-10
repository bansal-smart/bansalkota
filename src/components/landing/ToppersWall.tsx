import { Link } from "react-router-dom";
import { Trophy, ArrowRight, MapPin } from "lucide-react";
import BansalBadge from "@/components/bansal/BansalBadge";
import { useTopToppers } from "@/hooks/useLandingData";

const ToppersWall = () => {
  const { data: toppers = [], isLoading } = useTopToppers(8);
  if (!isLoading && toppers.length === 0) return null;

  return (
    <section className="relative py-12 md:py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10">
          <BansalBadge tone="orange">
            <Trophy className="h-3 w-3 mr-1" /> Wall of Fame
          </BansalBadge>
          <h2 className="mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-bansal-black">
            Real Ranks. Real <span className="text-bansal-orange">Scholars</span>.
          </h2>
          <p className="mt-2 text-sm md:text-base text-bansal-gray">
            A glimpse at the latest selections mentored at Bansal — every face here is a journey of discipline, doubt-solving and unwavering belief.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {(isLoading ? Array.from({ length: 8 }) : toppers).map((t: any, i) => (
            <div
              key={t?.id ?? i}
              className="group relative rounded-2xl overflow-hidden bg-bansal-blue text-white shadow-md hover:shadow-2xl hover-lift transition-all aspect-[4/5]"
            >
              {t?.photo_url ? (
                <img src={t.photo_url} alt={t.name} className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              ) : (
                <div className="absolute inset-0 grid place-items-center text-white/30 font-display font-extrabold text-5xl">
                  {t?.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) ?? "★"}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-bansal-blue via-bansal-blue/50 to-transparent" />
              {t?.rank_label && (
                <span className="absolute top-2.5 left-2.5 rounded-full bg-bansal-orange text-white text-[10px] font-bold px-2 py-1">
                  {t.rank_label}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-3">
                <div className="font-display font-bold text-sm leading-tight line-clamp-1">{t?.name ?? "Loading…"}</div>
                <div className="mt-0.5 text-[10px] text-white/80 uppercase tracking-wide">{t?.exam}</div>
                {t?.city && (
                  <div className="mt-1 text-[10px] text-white/70 flex items-center gap-1">
                    <MapPin className="h-2.5 w-2.5" /> {t.city}{t?.year ? ` · ${t.year}` : ""}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link to="/achievements" className="inline-flex items-center gap-1 text-sm font-semibold text-bansal-blue hover:text-bansal-orange">
            See all 5,000+ selections <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ToppersWall;
