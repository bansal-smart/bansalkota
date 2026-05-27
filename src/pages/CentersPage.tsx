import { useMemo, useState } from "react";
import { MapPin, Phone, Search, Building2, Star } from "lucide-react";
import BansalButton from "@/components/bansal/BansalButton";
import BansalCard from "@/components/bansal/BansalCard";
import BansalBadge from "@/components/bansal/BansalBadge";

type Center = {
  city: string;
  state: string;
  region: "North" | "South" | "East" | "West" | "Central";
  address: string;
  phone: string;
  isHQ?: boolean;
};

const CENTERS: Center[] = [
  { city: "Kota (HQ)", state: "Rajasthan", region: "North", address: "Bansal Tower, A-10, Road No. 1, IPIA, Kota-324005", phone: "+91 9773343246", isHQ: true },
  { city: "Jaipur", state: "Rajasthan", region: "North", address: "Vaishali Nagar, Jaipur", phone: "+91 8003045222" },
  { city: "Ajmer", state: "Rajasthan", region: "North", address: "Civil Lines, Ajmer", phone: "+91 8003045222" },
  { city: "Udaipur", state: "Rajasthan", region: "North", address: "Hiran Magri, Udaipur", phone: "+91 8003045222" },
  { city: "Jodhpur", state: "Rajasthan", region: "North", address: "Shastri Nagar, Jodhpur", phone: "+91 8003045222" },
  { city: "Delhi", state: "Delhi", region: "North", address: "Pitampura, New Delhi", phone: "+91 9773343246" },
  { city: "Gurugram", state: "Haryana", region: "North", address: "Sector 14, Gurugram", phone: "+91 9773343246" },
  { city: "Noida", state: "Uttar Pradesh", region: "North", address: "Sector 62, Noida", phone: "+91 9773343246" },
  { city: "Lucknow", state: "Uttar Pradesh", region: "North", address: "Gomti Nagar, Lucknow", phone: "+91 9773343246" },
  { city: "Kanpur", state: "Uttar Pradesh", region: "North", address: "Swaroop Nagar, Kanpur", phone: "+91 9773343246" },
  { city: "Varanasi", state: "Uttar Pradesh", region: "East", address: "Sigra, Varanasi", phone: "+91 9773343246" },
  { city: "Allahabad (Prayagraj)", state: "Uttar Pradesh", region: "East", address: "Civil Lines, Prayagraj", phone: "+91 9773343246" },
  { city: "Patna", state: "Bihar", region: "East", address: "Boring Road, Patna", phone: "+91 9773343246" },
  { city: "Ranchi", state: "Jharkhand", region: "East", address: "Lalpur, Ranchi", phone: "+91 9773343246" },
  { city: "Kolkata", state: "West Bengal", region: "East", address: "Salt Lake, Kolkata", phone: "+91 9773343246" },
  { city: "Bhubaneswar", state: "Odisha", region: "East", address: "Saheed Nagar, Bhubaneswar", phone: "+91 9773343246" },
  { city: "Mumbai", state: "Maharashtra", region: "West", address: "Andheri West, Mumbai", phone: "+91 9773343246" },
  { city: "Pune", state: "Maharashtra", region: "West", address: "Kothrud, Pune", phone: "+91 9773343246" },
  { city: "Nagpur", state: "Maharashtra", region: "West", address: "Dharampeth, Nagpur", phone: "+91 9773343246" },
  { city: "Ahmedabad", state: "Gujarat", region: "West", address: "C.G. Road, Ahmedabad", phone: "+91 9773343246" },
  { city: "Surat", state: "Gujarat", region: "West", address: "Adajan, Surat", phone: "+91 9773343246" },
  { city: "Indore", state: "Madhya Pradesh", region: "Central", address: "Vijay Nagar, Indore", phone: "+91 9773343246" },
  { city: "Bhopal", state: "Madhya Pradesh", region: "Central", address: "M.P. Nagar, Bhopal", phone: "+91 9773343246" },
  { city: "Raipur", state: "Chhattisgarh", region: "Central", address: "Shankar Nagar, Raipur", phone: "+91 9773343246" },
  { city: "Hyderabad", state: "Telangana", region: "South", address: "Ameerpet, Hyderabad", phone: "+91 9773343246" },
  { city: "Bengaluru", state: "Karnataka", region: "South", address: "Indiranagar, Bengaluru", phone: "+91 9773343246" },
  { city: "Chennai", state: "Tamil Nadu", region: "South", address: "T. Nagar, Chennai", phone: "+91 9773343246" },
];

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
        c.address.toLowerCase().includes(q)
      );
    });
  }, [query, region]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-bansal-blue text-white py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <BansalBadge variant="orange" className="mb-4">Offline Network</BansalBadge>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Bansal Classes Centers
          </h1>
          <p className="text-white/85 text-lg max-w-2xl mx-auto">
            From the Kota headquarters to {CENTERS.length - 1}+ cities across India — find a Bansal center near you and walk in for counselling.
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
        </div>
      </section>

      {/* Center cards */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              No centers match your search. Try a different city or region.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <BansalCard key={c.city} className={c.isHQ ? "border-2 border-bansal-orange" : ""}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-4 w-4 text-bansal-blue" />
                        <h3 className="font-display text-lg font-bold text-bansal-black">{c.city}</h3>
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
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Bansal Classes " + c.city)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BansalButton variant="outline" className="w-full text-sm">
                      Get Directions
                    </BansalButton>
                  </a>
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
            Not sure which center suits you?
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
