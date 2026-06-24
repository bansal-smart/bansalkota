import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Search, ArrowRight, Building2, Star, Crown } from "lucide-react";
import BansalBadge from "@/components/bansal/BansalBadge";
import { useCentresShowcase } from "@/hooks/useLandingData";

const CentresShowcase = () => {
  const { data: centres = [], isLoading } = useCentresShowcase();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return centres;
    return centres.filter((c) => c.city.toLowerCase().includes(k) || c.state.toLowerCase().includes(k));
  }, [centres, q]);

  const featured = useMemo(() => filtered.filter((c) => c.is_featured), [filtered]);
  const rest = useMemo(() => filtered.filter((c) => !c.is_featured), [filtered]);

  const byRegion = useMemo(() => {
    const m: Record<string, typeof rest> = {};
    rest.forEach((c) => { (m[c.region] ||= []).push(c); });
    return m;
  }, [rest]);

  return (
    <section className="relative py-12 md:py-20 bg-bansal-cream/40">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-8 md:mb-10">
          <BansalBadge tone="blue"><Building2 className="h-3 w-3 mr-1" /> Pan-India & Dubai</BansalBadge>
          <h2 className="mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-bansal-black">
            A Bansal Centre Near <span className="text-bansal-orange">You</span>
          </h2>
          <p className="mt-2 text-sm md:text-base text-bansal-gray">
            100+ centres across India and Dubai — every one staffed with master mentors, libraries and the same Bansal curriculum that built Kota.
          </p>
          <div className="mt-5 max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bansal-gray" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by city or state…"
              className="w-full rounded-full border border-border bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bansal-orange"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-white border border-border animate-pulse" />
            ))}
          </div>
        ) : Object.keys(byRegion).length === 0 && featured.length === 0 ? (
          <p className="text-center text-sm text-bansal-gray py-10">No centres match "{q}". Try another city.</p>
        ) : (
          <>
            {/* Flagship featured cards */}
            {featured.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="h-4 w-4 text-bansal-orange" />
                  <span className="text-xs font-bold uppercase tracking-wide text-bansal-orange">Flagship Centre{featured.length > 1 ? "s" : ""}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {featured.map((c) => (
                    <Link
                      key={c.id}
                      to={`/centres/${c.slug}`}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-bansal-blue to-bansal-blue-dark text-white p-5 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
                    >
                      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-bansal-orange/20 blur-3xl pointer-events-none" />
                      <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-bansal-orange/90 text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                        <Star className="h-3 w-3 fill-white" /> Flagship
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 rounded-xl bg-bansal-orange/30 flex items-center justify-center shrink-0">
                          <MapPin className="h-5 w-5 text-bansal-orange" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-display text-2xl font-extrabold leading-tight">
                            {c.city} {c.is_hq && <span className="text-[10px] text-bansal-orange ml-1 align-middle">HQ</span>}
                          </div>
                          <div className="text-[12px] text-white/75">{c.state} · {c.region}</div>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-white/80 leading-relaxed">
                        The original Bansal Classes campus — where the JEE legacy began in 1981.
                      </p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-bansal-orange group-hover:underline">
                        Visit flagship campus <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          {Object.keys(byRegion).length > 0 && (
          <div className="space-y-6">
            {Object.entries(byRegion).map(([region, list]) => (
              <div key={region}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wide text-bansal-blue">{region}</span>
                  <span className="text-[10px] text-bansal-gray">{list.length} centres</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {list.map((c) => (
                    <Link
                      key={c.id}
                      to={`/centres/${c.slug}`}
                      className="group rounded-xl bg-white border border-border p-3 hover-lift shadow-sm hover:shadow-md hover:border-bansal-orange/40 transition-all"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-bansal-orange shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="font-display font-bold text-bansal-black text-sm truncate">
                            {c.city} {c.is_hq && <span className="text-[9px] text-bansal-orange ml-1">HQ</span>}
                          </div>
                          <div className="text-[11px] text-bansal-gray truncate">{c.state}</div>
                        </div>
                      </div>
                      <span className="mt-2 text-[10px] font-semibold text-bansal-blue group-hover:text-bansal-orange inline-flex items-center gap-0.5">
                        Visit centre <ArrowRight className="h-3 w-3" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          )}
          </>
        )}


        <div className="mt-8 text-center">
          <Link to="/centres" className="inline-flex items-center gap-1 text-sm font-semibold text-bansal-blue hover:text-bansal-orange">
            Explore all centres <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CentresShowcase;
