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
              className="group relative rounded-2xl overflow-hidden bg-bansal-blue text-white shadow-md hover:shadow-2xl hover-lift transition-all p-4 md:p-5 flex flex-col justify-between min-h-[160px]"
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-bansal-orange/20 blur-2xl pointer-events-none" />
              {t?.rank_label && (
                <span className="self-start rounded-full bg-bansal-orange text-white text-[10px] font-bold px-2.5 py-1 shadow">
                  {t.rank_label}
                </span>
              )}
              <div className="relative mt-4">
                <div className="font-display font-bold text-base md:text-lg leading-tight line-clamp-2">
                  {t?.name ?? "Loading…"}
                </div>
                <div className="mt-1 text-[10px] md:text-xs text-white/80 uppercase tracking-wider font-semibold">
                  {t?.exam}
                </div>
                {(t?.city || t?.year) && (
                  <div className="mt-2 text-[10px] md:text-xs text-white/70 flex items-center gap-1">
                    {t?.city && <MapPin className="h-2.5 w-2.5" />}
                    {t?.city}{t?.city && t?.year ? " · " : ""}{t?.year ?? ""}
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
