import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone, Search, Star, ArrowRight, ShieldCheck, Building2 } from "lucide-react";
import BansalButton from "@/components/bansal/BansalButton";
import BansalBadge from "@/components/bansal/BansalBadge";
import { THEME_IMAGE, STATE_COUNT } from "@/data/centers";
import centersHero from "@/assets/centers-hero.png";
import { FloatingIcons, DotTexture } from "@/components/bansal/BansalDecor";
import { useCenters, getCenterImage, type DBCenter } from "@/hooks/useCenters";
import { useSiteBanner } from "@/hooks/useSiteBanner";

const REGIONS = ["All", "North", "South", "East", "West", "Central"] as const;

export default function CentersPage() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("All");
  const { centers: CENTERS } = useCenters();
  const { banner } = useSiteBanner("centers");
  const CENTER_COUNT = CENTERS.length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CENTERS.filter((c) => {
      if (region !== "All" && c.region !== region) return false;
      if (!q) return true;
      return (
        c.city.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        (c.area ?? "").toLowerCase().includes(q)
      );
    });
  }, [query, region]);

  const displayName = (c: (typeof CENTERS)[number]) =>
    c.area && c.area !== c.city ? `${c.city} — ${c.area}` : c.city;

  const regionCount = (r: (typeof REGIONS)[number]) =>
    r === "All" ? CENTER_COUNT : CENTERS.filter((c) => c.region === r).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-bansal-blue text-white py-14 md:py-20 relative overflow-hidden">
        <img src={centersHero} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-br from-bansal-blue/85 via-bansal-blue/80 to-bansal-blue-dark/90" />
        <div className="absolute inset-0 grid-texture opacity-40" />
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-bansal-orange/30 blur-3xl" />
        <FloatingIcons defaultTone="white" />
        <DotTexture tone="white" className="opacity-25 decor-fade" />
        <div className="container mx-auto px-4 max-w-5xl text-center relative">
          <BansalBadge tone="orange" className="mb-4">Offline Network · Pan India</BansalBadge>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold mb-4 leading-tight">
            Bansal Classes <span className="text-bansal-orange">Centres</span>
          </h1>
          <p className="text-white/85 text-base md:text-lg max-w-2xl mx-auto">
            From the legendary Kota headquarters to {CENTER_COUNT - 1}+ centres across India —
            walk in to a Bansal centre near you for counselling, demo classes & admissions.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-xl mx-auto">
            <div className="rounded-2xl bg-white/10 backdrop-blur p-4">
              <div className="font-display text-3xl font-extrabold text-bansal-orange">{CENTER_COUNT}+</div>
              <div className="text-xs text-white/80 mt-1">Centres</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur p-4">
              <div className="font-display text-3xl font-extrabold text-bansal-orange">{STATE_COUNT}</div>
              <div className="text-xs text-white/80 mt-1">States & UTs</div>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur p-4">
              <div className="font-display text-3xl font-extrabold text-bansal-orange">34+</div>
              <div className="text-xs text-white/80 mt-1">Years Legacy</div>
            </div>
          </div>
        </div>
      </section>

      {/* Search + Filters */}
      <section className="py-6 border-b border-border sticky top-[72px] z-30 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-3 max-w-5xl mx-auto">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                placeholder="Search by city, state, or area…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-white pl-10 pr-4 py-3 text-sm text-bansal-black placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-bansal-orange"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    region === r
                      ? "bg-bansal-blue text-white shadow-md"
                      : "bg-bansal-blue-light text-bansal-blue hover:bg-bansal-blue hover:text-white"
                  }`}
                >
                  {r} <span className="ml-1 text-[10px] opacity-80">{regionCount(r)}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Showing <span className="font-semibold text-bansal-black">{filtered.length}</span> of {CENTER_COUNT} centres
          </p>
        </div>
      </section>

      {/* Centre cards */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              No centres match your search. Try a different city or region.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <Link
                  key={c.slug}
                  to={`/centers/${c.slug}`}
                  className="group block rounded-2xl overflow-hidden bg-white border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  {/* Thumbnail */}
                  <div className="relative h-44 overflow-hidden bg-bansal-blue">
                    <img
                      src={THEME_IMAGE[c.theme]}
                      alt={`${displayName(c)} city view`}
                      loading="lazy"
                      className="h-full w-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-bansal-black/85 via-bansal-black/10 to-transparent pointer-events-none" />
                    {c.isHQ && (
                      <div className="absolute top-3 left-3">
                        <BansalBadge tone="orange" className="flex items-center gap-1 shadow-lg">
                          <Star className="h-3 w-3" fill="currentColor" /> Headquarters
                        </BansalBadge>
                      </div>
                    )}
                    {c.verified && !c.isHQ && (
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-bansal-blue shadow">
                          <ShieldCheck className="h-3 w-3" /> Verified
                        </span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className="rounded-full bg-bansal-blue/90 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-white">
                        {c.region}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="font-display text-xl font-extrabold text-white drop-shadow leading-tight">
                        {displayName(c)}
                      </h3>
                      <p className="text-xs text-white/85 mt-0.5">{c.state}</p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-3">
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-bansal-orange" />
                      <span className="line-clamp-2">{c.address}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <a
                        href={`tel:${c.phone.replace(/\s+/g, "")}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-xs font-semibold text-bansal-blue hover:text-bansal-orange"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Call
                      </a>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-bansal-orange group-hover:gap-2 transition-all">
                        View centre <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-bansal-cream">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <Building2 className="h-10 w-10 text-bansal-orange mx-auto mb-3" />
          <h2 className="font-display text-2xl md:text-3xl font-bold text-bansal-black mb-3">
            Not sure which centre suits you?
          </h2>
          <p className="text-muted-foreground mb-6">
            Talk to a Bansal admissions counsellor — we'll guide you on programs, batches,
            and the nearest centre with available seats.
          </p>
          <a href="/contact">
            <BansalButton variant="cta">Talk to a Counsellor</BansalButton>
          </a>
        </div>
      </section>
    </div>
  );
}
