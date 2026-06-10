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
  ShieldCheck,
  Award,
  Clock,
} from "lucide-react";
import BansalButton from "@/components/bansal/BansalButton";
import BansalCard from "@/components/bansal/BansalCard";
import BansalBadge from "@/components/bansal/BansalBadge";
import { CENTERS, THEME_IMAGE, findCenter } from "@/data/centers";
import { useCenters } from "@/hooks/useCenters";

const PROGRAMS = [
  {
    icon: GraduationCap,
    title: "JEE (Main + Advanced)",
    desc: "2-year & 1-year programs for engineering aspirants. Daily problem-solving, weekly tests, IIT-veteran faculty.",
    tag: "Engineering",
  },
  {
    icon: GraduationCap,
    title: "NEET (UG)",
    desc: "Integrated NEET preparation with NCERT-anchored teaching, AIIMS-style MCQs and dedicated biology mentors.",
    tag: "Medical",
  },
  {
    icon: BookOpen,
    title: "Foundation (Class 8–10)",
    desc: "Build a strong base for NTSE, KVPY, Olympiads & Boards. Conceptual depth + competitive aptitude.",
    tag: "Foundation",
  },
];

const FACILITIES = [
  "AC classrooms",
  "Doubt clinics",
  "Library & reading hall",
  "Mock test infrastructure",
  "Mentor support",
  "Parent-teacher meets",
];

export default function CenterDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { centers: DB_CENTERS } = useCenters();
  const dbCenter = slug ? DB_CENTERS.find((c) => c.slug === slug) : undefined;
  const center = dbCenter ?? (slug ? findCenter(slug) : undefined);

  const nearby = useMemo(() => {
    if (!center) return [];
    const pool = DB_CENTERS.length ? DB_CENTERS : (CENTERS as any[]);
    return pool.filter(
      (c) => c.slug !== center.slug && (c.state === center.state || c.region === center.region),
    ).slice(0, 6);
  }, [center, DB_CENTERS]);

  if (!center) return <Navigate to="/centers" replace />;

  const displayName =
    center.area && center.area !== center.city ? `${center.city} — ${center.area}` : center.city;
  const mapQuery = encodeURIComponent(`Bansal Classes ${displayName}, ${center.state}`);
  const heroImg = (dbCenter?.image_url) || THEME_IMAGE[center.theme];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero with city image */}
      <section className="relative h-[420px] md:h-[480px] overflow-hidden">
        <img
          src={heroImg}
          alt={`${displayName} city view`}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bansal-blue via-bansal-blue/85 to-bansal-blue/40" />
        <div className="absolute inset-0 grid-texture opacity-20" />

        <div className="container mx-auto px-4 max-w-5xl relative h-full flex flex-col justify-end pb-10 md:pb-12">
          <Link
            to="/centers"
            className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white mb-5 self-start"
          >
            <ArrowLeft className="h-4 w-4" /> All centres
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <BansalBadge tone="orange" className="flex items-center gap-1">
              <Building2 className="h-3 w-3" /> {center.region} India
            </BansalBadge>
            {center.isHQ && (
              <span className="inline-flex items-center gap-1 rounded-full bg-bansal-orange text-white px-3 py-1 text-xs font-bold shadow-lg">
                <Star className="h-3 w-3" fill="currentColor" /> Headquarters
              </span>
            )}
            {center.verified && !center.isHQ && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-bansal-blue">
                <ShieldCheck className="h-3 w-3" /> Verified Centre
              </span>
            )}
            {center.established && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-semibold text-white">
                <Award className="h-3 w-3" /> Est. {center.established}
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl md:text-5xl font-extrabold text-white leading-tight">
            Bansal Classes
            <span className="block text-bansal-orange mt-1">{displayName}</span>
          </h1>
          <p className="mt-3 text-white/90 text-base max-w-2xl">
            {center.state} · Walk in for counselling, demo classes and admission queries.
            Our centre team is happy to help you choose the right program.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
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
              <BansalButton
                variant="outline"
                className="inline-flex items-center gap-2 bg-white/10 text-white border-white/40 hover:bg-white hover:text-bansal-blue"
              >
                <Navigation className="h-4 w-4" /> Get directions
              </BansalButton>
            </a>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Contact / address */}
            <BansalCard className="md:col-span-2">
              <h2 className="font-display text-xl font-bold text-bansal-black mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-bansal-orange" />
                Centre details
              </h2>
              <ul className="space-y-4 text-sm">
                <li className="flex gap-3">
                  <MapPin className="h-5 w-5 mt-0.5 text-bansal-orange shrink-0" />
                  <div>
                    <p className="font-semibold text-bansal-black">Address</p>
                    <p className="text-muted-foreground">{center.address}</p>
                    {!center.verified && (
                      <p className="text-[11px] text-muted-foreground/80 mt-1 italic">
                        Please call to confirm exact branch location before visiting.
                      </p>
                    )}
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
                      href={`mailto:${center.email ?? "info@bansalclasses.com"}`}
                      className="text-bansal-blue hover:text-bansal-blue-dark font-semibold"
                    >
                      {center.email ?? "info@bansalclasses.com"}
                    </a>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Clock className="h-5 w-5 mt-0.5 text-bansal-orange shrink-0" />
                  <div>
                    <p className="font-semibold text-bansal-black">Counselling hours</p>
                    <p className="text-muted-foreground">Mon – Sat · 9:30 AM – 7:00 PM</p>
                    <p className="text-muted-foreground">Sunday · 10:00 AM – 2:00 PM</p>
                  </div>
                </li>
              </ul>

              {/* Facilities */}
              <div className="mt-6 pt-6 border-t border-border">
                <p className="font-semibold text-bansal-black mb-3 text-sm">Centre facilities</p>
                <div className="flex flex-wrap gap-2">
                  {FACILITIES.map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-bansal-blue-light text-bansal-blue px-3 py-1 text-xs font-semibold"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </BansalCard>

            {/* Quick stats */}
            <div className="space-y-4">
              <BansalCard>
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-5 w-5 text-bansal-blue" />
                  <p className="font-semibold text-bansal-black text-sm">Students mentored</p>
                </div>
                <p className="font-display text-2xl font-bold text-bansal-blue">
                  {center.isHQ ? "1L+" : "10,000+"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {center.isHQ ? "Since 1991" : "Across Bansal network"}
                </p>
              </BansalCard>
              <BansalCard>
                <div className="flex items-center gap-3 mb-2">
                  <GraduationCap className="h-5 w-5 text-bansal-blue" />
                  <p className="font-semibold text-bansal-black text-sm">Selections (2024)</p>
                </div>
                <p className="font-display text-2xl font-bold text-bansal-blue">2,500+</p>
                <p className="text-xs text-muted-foreground mt-1">JEE & NEET combined</p>
              </BansalCard>
              {center.established && (
                <BansalCard className="bg-bansal-orange-light/40 border-bansal-orange/30">
                  <div className="flex items-center gap-3 mb-2">
                    <CalendarDays className="h-5 w-5 text-bansal-orange" />
                    <p className="font-semibold text-bansal-black text-sm">Established</p>
                  </div>
                  <p className="font-display text-2xl font-bold text-bansal-orange">{center.established}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date().getFullYear() - center.established}+ years serving this city
                  </p>
                </BansalCard>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="mt-10">
            <h2 className="font-display text-xl font-bold text-bansal-black mb-4 flex items-center gap-2">
              <Navigation className="h-5 w-5 text-bansal-orange" />
              Find us on the map
            </h2>
            <div className="rounded-2xl overflow-hidden border border-border shadow-md">
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
            <h2 className="font-display text-2xl font-bold text-bansal-black mb-2">
              Programs offered at {displayName}
            </h2>
            <p className="text-sm text-muted-foreground mb-5">
              Choose the program that matches your goal. All include Bansal study material,
              tests and mentor support.
            </p>
            <div className="grid md:grid-cols-3 gap-5">
              {PROGRAMS.map((p) => (
                <BansalCard key={p.title} className="relative">
                  <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider text-bansal-orange bg-bansal-orange-light/60 rounded-full px-2 py-0.5">
                    {p.tag}
                  </span>
                  <div className="h-11 w-11 rounded-xl bg-bansal-blue-light flex items-center justify-center mb-3">
                    <p.icon className="h-6 w-6 text-bansal-blue" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-bansal-black mb-1.5">
                    {p.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                  <Link
                    to="/courses"
                    className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-bansal-blue hover:text-bansal-orange"
                  >
                    Explore courses <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </BansalCard>
              ))}
            </div>
          </div>

          {/* Nearby centres — with thumbnails */}
          {nearby.length > 0 && (
            <div className="mt-12">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-bansal-black">
                    Other Bansal centres nearby
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Explore more centres in {center.state} & {center.region} India.
                  </p>
                </div>
                <Link to="/centers" className="text-sm font-semibold text-bansal-blue hover:underline whitespace-nowrap">
                  View all
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearby.map((c) => (
                  <Link
                    key={c.slug}
                    to={`/centers/${c.slug}`}
                    className="group block rounded-xl overflow-hidden bg-white border border-border hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                    <div className="relative h-28 overflow-hidden bg-bansal-blue">
                      <img
                        src={THEME_IMAGE[c.theme]}
                        alt={c.city}
                        loading="lazy"
                        className="h-full w-full object-contain p-1.5 group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-bansal-black/80 to-transparent pointer-events-none" />
                      <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                        <div>
                          <p className="font-display font-bold text-white text-sm drop-shadow">
                            {c.area && c.area !== c.city ? `${c.city} — ${c.area}` : c.city}
                          </p>
                          <p className="text-[10px] text-white/85">{c.state}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {dbCenter?.id && <CenterOfflineSections centerId={dbCenter.id} centerCity={displayName} />}

      {/* CTA */}
      <section className="py-14 bg-bansal-cream">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-bansal-black mb-3">
            Ready to start at {displayName}?
          </h2>
          <p className="text-muted-foreground mb-6">
            Book a free counselling session. Our team will walk you through batches, fees and
            scholarship options available at this centre.
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
