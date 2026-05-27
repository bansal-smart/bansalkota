import { useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Building2,
  Star,
  CalendarDays,
  GraduationCap,
  BookOpen,
  Users,
  Mail,
  Navigation,
  ArrowRight,
} from "lucide-react";
import BansalButton from "@/components/bansal/BansalButton";
import BansalCard from "@/components/bansal/BansalCard";
import BansalBadge from "@/components/bansal/BansalBadge";
import { CENTERS, findCenter } from "@/data/centers";

const PROGRAMS = [
  { icon: GraduationCap, title: "JEE (Main + Advanced)", desc: "2-year & 1-year programs for engineering aspirants." },
  { icon: GraduationCap, title: "NEET (UG)", desc: "Comprehensive medical entrance prep with mentorship." },
  { icon: BookOpen, title: "Foundation (Class 8–10)", desc: "Build a strong base for NTSE, Olympiads & Boards." },
];

export default function CenterDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const center = slug ? findCenter(slug) : undefined;

  const nearby = useMemo(() => {
    if (!center) return [];
    return CENTERS.filter(
      (c) => c.slug !== center.slug && (c.state === center.state || c.region === center.region),
    ).slice(0, 6);
  }, [center]);

  if (!center) return <Navigate to="/centers" replace />;

  const displayName =
    center.area && center.area !== center.city ? `${center.city} — ${center.area}` : center.city;
  const mapQuery = encodeURIComponent(`Bansal Classes ${displayName}, ${center.state}`);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-bansal-blue text-white py-12 md:py-16 relative overflow-hidden">
        <div className="container mx-auto px-4 max-w-5xl relative">
          <Link
            to="/centers"
            className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white mb-5"
          >
            <ArrowLeft className="h-4 w-4" /> All centres
          </Link>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BansalBadge variant="orange" className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {center.region} India
                </BansalBadge>
                {center.isHQ && (
                  <BansalBadge variant="orange" className="flex items-center gap-1">
                    <Star className="h-3 w-3" /> Headquarters
                  </BansalBadge>
                )}
              </div>
              <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight">
                Bansal Classes
                <span className="block text-white/90 mt-1">{displayName}</span>
              </h1>
              <p className="mt-3 text-white/85 text-base max-w-2xl">
                {center.state} · Walk in for counselling, demo classes and admission queries. Our
                centre team is happy to help you choose the right program.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a href={`tel:${center.phone.replace(/\s+/g, "")}`}>
                <BansalButton variant="cta" className="inline-flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Call centre
                </BansalButton>
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <BansalButton variant="outline" className="inline-flex items-center gap-2 bg-white/10 text-white border-white/30 hover:bg-white hover:text-bansal-blue">
                  <Navigation className="h-4 w-4" /> Directions
                </BansalButton>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Contact / address */}
            <BansalCard className="md:col-span-2">
              <h2 className="font-display text-xl font-bold text-bansal-black mb-4">Centre details</h2>
              <ul className="space-y-4 text-sm">
                <li className="flex gap-3">
                  <MapPin className="h-5 w-5 mt-0.5 text-bansal-orange shrink-0" />
                  <div>
                    <p className="font-semibold text-bansal-black">Address</p>
                    <p className="text-muted-foreground">{center.address}</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Phone className="h-5 w-5 mt-0.5 text-bansal-orange shrink-0" />
                  <div>
                    <p className="font-semibold text-bansal-black">Phone</p>
                    <a
                      href={`tel:${center.phone.replace(/\s+/g, "")}`}
                      className="text-bansal-blue hover:text-bansal-blue-dark font-semibold"
                    >
                      {center.phone}
                    </a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Mail className="h-5 w-5 mt-0.5 text-bansal-orange shrink-0" />
                  <div>
                    <p className="font-semibold text-bansal-black">Email</p>
                    <a
                      href="mailto:info@bansalclasses.com"
                      className="text-bansal-blue hover:text-bansal-blue-dark font-semibold"
                    >
                      info@bansalclasses.com
                    </a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <CalendarDays className="h-5 w-5 mt-0.5 text-bansal-orange shrink-0" />
                  <div>
                    <p className="font-semibold text-bansal-black">Counselling hours</p>
                    <p className="text-muted-foreground">Mon – Sat · 9:30 AM – 7:00 PM</p>
                  </div>
                </li>
              </ul>
            </BansalCard>

            {/* Quick stats */}
            <div className="space-y-4">
              <BansalCard>
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-5 w-5 text-bansal-blue" />
                  <p className="font-semibold text-bansal-black">Students mentored</p>
                </div>
                <p className="font-display text-2xl font-bold text-bansal-blue">10,000+</p>
                <p className="text-xs text-muted-foreground mt-1">Across Bansal network</p>
              </BansalCard>
              <BansalCard>
                <div className="flex items-center gap-3 mb-2">
                  <GraduationCap className="h-5 w-5 text-bansal-blue" />
                  <p className="font-semibold text-bansal-black">Selections (2024)</p>
                </div>
                <p className="font-display text-2xl font-bold text-bansal-blue">2,500+</p>
                <p className="text-xs text-muted-foreground mt-1">JEE & NEET combined</p>
              </BansalCard>
            </div>
          </div>

          {/* Map */}
          <div className="mt-8">
            <h2 className="font-display text-xl font-bold text-bansal-black mb-4">Find us on the map</h2>
            <div className="rounded-xl overflow-hidden border border-border shadow-sm">
              <iframe
                title={`Map of Bansal Classes ${displayName}`}
                src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                width="100%"
                height="380"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="border-0 block"
              />
            </div>
          </div>

          {/* Programs */}
          <div className="mt-12">
            <h2 className="font-display text-xl font-bold text-bansal-black mb-4">
              Programs offered at {displayName}
            </h2>
            <div className="grid md:grid-cols-3 gap-5">
              {PROGRAMS.map((p) => (
                <BansalCard key={p.title}>
                  <p.icon className="h-7 w-7 text-bansal-orange mb-3" />
                  <h3 className="font-display text-lg font-bold text-bansal-black mb-1.5">
                    {p.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                </BansalCard>
              ))}
            </div>
          </div>

          {/* Nearby centres */}
          {nearby.length > 0 && (
            <div className="mt-12">
              <div className="flex items-end justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-bansal-black">
                  Other Bansal centres nearby
                </h2>
                <Link to="/centers" className="text-sm font-semibold text-bansal-blue hover:underline">
                  View all
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearby.map((c) => (
                  <Link key={c.slug} to={`/centers/${c.slug}`}>
                    <BansalCard className="hover:border-bansal-orange transition-colors h-full">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-display font-bold text-bansal-black">
                            {c.area && c.area !== c.city ? `${c.city} — ${c.area}` : c.city}
                          </p>
                          <p className="text-xs text-muted-foreground">{c.state}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-bansal-blue" />
                      </div>
                    </BansalCard>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-bansal-cream">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-bansal-black mb-3">
            Ready to start at {displayName}?
          </h2>
          <p className="text-muted-foreground mb-6">
            Book a free counselling session. Our team will walk you through batches, fees and
            scholarship options.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={`tel:${center.phone.replace(/\s+/g, "")}`}>
              <BansalButton variant="cta" className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4" /> Call {center.phone}
              </BansalButton>
            </a>
            <a href="/contact">
              <BansalButton variant="outline">Enquire online</BansalButton>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
