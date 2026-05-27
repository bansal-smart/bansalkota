import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone, Search, Building2, Star, ArrowRight } from "lucide-react";
import BansalButton from "@/components/bansal/BansalButton";
import BansalCard from "@/components/bansal/BansalCard";
import BansalBadge from "@/components/bansal/BansalBadge";
import { CENTERS } from "@/data/centers";

const REGIONS = ["All", "North", "South", "East", "West", "Central"] as const;

export default function CentersPage() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<(typeof REGIONS)[number]>("All");

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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-bansal-blue text-white py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <BansalBadge variant="orange" className="mb-4">Offline Network</BansalBadge>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Bansal Classes Centres
          </h1>
          <p className="text-white/85 text-lg max-w-2xl mx-auto">
            From the Kota headquarters to {CENTERS.length - 1}+ centres across India — find a Bansal centre near you and walk in for counselling.
          </p>
        </div>
      </section>

      {/* Search + Filters */}
      <section className="py-8 border-b border-border sticky top-[72px] z-30 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-3 max-w-5xl mx-auto">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                placeholder="Search by city, state, or area…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-white pl-10 pr-4 py-3 text-sm text-bansal-black placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-bansal-orange"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    region === r
                      ? "bg-bansal-blue text-white"
                      : "bg-bansal-blue-light text-bansal-blue hover:bg-bansal-blue hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Showing {filtered.length} of {CENTERS.length} centres
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
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <BansalCard key={c.slug} className={c.isHQ ? "border-2 border-bansal-orange" : ""}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-bansal-blue" />
                        <h3 className="font-display text-lg font-bold text-bansal-black">{displayName(c)}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.state} · {c.region} India</p>
                    </div>
                    {c.isHQ && (
                      <BansalBadge variant="orange" className="flex items-center gap-1">
                        <Star className="h-3 w-3" /> HQ
                      </BansalBadge>
                    )}
                  </div>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-bansal-orange" />
                      <span>{c.address}</span>
                    </div>
                    <a href={`tel:${c.phone.replace(/\s+/g, "")}`} className="flex gap-2 text-bansal-blue hover:text-bansal-blue-dark font-semibold">
                      <Phone className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{c.phone}</span>
                    </a>
                  </div>
                  <Link to={`/centers/${c.slug}`}>
                    <BansalButton variant="outline" className="w-full text-sm inline-flex items-center justify-center gap-2">
                      View centre <ArrowRight className="h-4 w-4" />
                    </BansalButton>
                  </Link>
                </BansalCard>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-bansal-cream">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-bansal-black mb-3">
            Not sure which centre suits you?
          </h2>
          <p className="text-muted-foreground mb-6">
            Talk to a Bansal admissions counsellor — we'll guide you on programs, batches, and the nearest available seat.
          </p>
          <a href="/contact">
            <BansalButton variant="cta">Talk to a Counsellor</BansalButton>
          </a>
        </div>
      </section>
    </div>
  );
}
