import { Link } from "react-router-dom";
import { ArrowRight, Flame, Users, Clock } from "lucide-react";
import BansalBadge from "@/components/bansal/BansalBadge";
import { useUpcomingBatches } from "@/hooks/useLandingData";

const examLabel: Record<string, string> = {
  jee: "JEE",
  neet: "NEET",
  foundation: "Foundation",
  olympiad: "Olympiad",
};

const inr = (v: number) => `₹${Number(v ?? 0).toLocaleString("en-IN")}`;

const UpcomingBatches = () => {
  const { data: batches = [], isLoading } = useUpcomingBatches(6);

  if (!isLoading && batches.length === 0) return null;

  return (
    <section className="relative py-12 md:py-20 bg-bansal-cream/40">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div className="max-w-xl">
            <BansalBadge tone="orange">
              <Flame className="h-3 w-3 mr-1" /> Filling Fast
            </BansalBadge>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-bansal-black">
              Live & Upcoming <span className="text-bansal-orange">Batches</span>
            </h2>
            <p className="mt-2 text-sm md:text-base text-bansal-gray">
              Reserve your seat before admissions close. Every batch is mentor-led and capped to protect personal attention.
            </p>
          </div>
          <Link to="/courses" className="text-sm font-semibold text-bansal-blue hover:text-bansal-orange inline-flex items-center gap-1">
            All Courses <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {(isLoading ? Array.from({ length: 6 }) : batches).map((b: any, i) => (
            <Link
              key={b?.id ?? i}
              to={b?.slug ? `/courses/${b.slug}` : "/courses"}
              className="group rounded-2xl bg-white border border-border overflow-hidden hover-lift shadow-sm hover:shadow-xl transition-all"
            >
              <div className="relative aspect-[16/9] bg-bansal-blue-light/40 overflow-hidden">
                {b?.thumbnail_url ? (
                  <img src={b.thumbnail_url} alt={b.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-bansal-blue/30 font-display font-bold text-3xl">
                    {b?.target_exam ? examLabel[b.target_exam] ?? b.target_exam.toUpperCase() : "Bansal"}
                  </div>
                )}
                {b?.badge && (
                  <span className="absolute top-3 left-3 rounded-full bg-bansal-orange text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 shadow">
                    {b.badge}
                  </span>
                )}
                {b?.discount_percent ? (
                  <span className="absolute top-3 right-3 rounded-full bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 shadow">
                    Save {b.discount_percent}%
                  </span>
                ) : null}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 text-[11px] text-bansal-gray">
                  {b?.target_exam && (
                    <span className="rounded-full bg-bansal-blue-light text-bansal-blue px-2 py-0.5 font-semibold">
                      {examLabel[b.target_exam] ?? b.target_exam.toUpperCase()}
                    </span>
                  )}
                  {b?.level && <span className="capitalize">{b.level}</span>}
                </div>
                <h3 className="mt-2 font-display font-bold text-bansal-black text-base leading-snug line-clamp-2 min-h-[2.75rem]">
                  {b?.name ?? "Loading batch…"}
                </h3>
                <p className="mt-1 text-xs text-bansal-gray flex items-center gap-1">
                  <Users className="h-3 w-3" /> {b?.educator_name ?? "—"}
                  {b?.total_enrolled ? <span className="ml-auto flex items-center gap-1"><Clock className="h-3 w-3" />{b.total_enrolled} enrolled</span> : null}
                </p>
                <div className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
                  <div>
                    <span className="font-display font-extrabold text-bansal-blue text-lg">{b?.price !== undefined ? inr(b.price) : ""}</span>
                    {b?.original_price ? (
                      <span className="ml-2 text-xs line-through text-bansal-gray">{inr(b.original_price)}</span>
                    ) : null}
                  </div>
                  <span className="text-xs font-semibold text-bansal-orange inline-flex items-center gap-0.5">
                    Enroll <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UpcomingBatches;
