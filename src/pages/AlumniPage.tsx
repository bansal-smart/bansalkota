import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search, Trophy, Building2, GraduationCap, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BansalBadge from "@/components/bansal/BansalBadge";
import BansalButton from "@/components/bansal/BansalButton";

type Alumnus = {
  id: string;
  name: string;
  rank_label: string | null;
  exam: string | null;
  year: number | null;
  photo_url: string | null;
  quote: string | null;
  current_position: string | null;
  company: string | null;
  batch_year: number | null;
  is_alumni: boolean;
};

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function AlumniPage() {
  const [items, setItems] = useState<Alumnus[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("toppers")
        .select(
          "id,name,rank,exam,year,photo_url,quote,current_position,company,batch_year,is_alumni",
        )
        .eq("is_alumni", true)
        .order("batch_year", { ascending: false, nullsFirst: false })
        .order("year", { ascending: false })
        .limit(300);
      setItems((data ?? []) as Alumnus[]);
      setLoading(false);
    })();
  }, []);

  const years = useMemo(() => {
    const set = new Set<number>();
    items.forEach((a) => {
      if (a.batch_year) set.add(a.batch_year);
      else if (a.year) set.add(a.year);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [items]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return items.filter((a) => {
      const y = a.batch_year ?? a.year;
      if (yearFilter !== "all" && String(y) !== yearFilter) return false;
      if (!k) return true;
      const hay = `${a.name} ${a.current_position ?? ""} ${a.company ?? ""} ${a.exam ?? ""}`.toLowerCase();
      return hay.includes(k);
    });
  }, [items, q, yearFilter]);

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-bansal-blue via-bansal-blue to-bansal-blue-dark text-white py-16 md:py-24">
        <div className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-bansal-orange/25 blur-3xl pointer-events-none" />
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl relative">
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-12 bg-bansal-orange" />
            <span className="text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold">
              Bansal Alumni Network
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
            Forty years of <span className="text-bansal-orange">Bansalians</span> —
            <br className="hidden md:block" /> the people who learned here, and then changed the world.
          </h1>
          <p className="mt-5 max-w-2xl text-white/85 text-base md:text-lg">
            IIT graduates, AIIMS doctors, founders, professors, ISRO engineers. Every story below
            began in a Bansal classroom.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <BansalBadge tone="orange">
              <Trophy className="h-3 w-3 mr-1" /> 1,200+ IIT selections
            </BansalBadge>
            <BansalBadge tone="orange">
              <Sparkles className="h-3 w-3 mr-1" /> 40+ years of legacy
            </BansalBadge>
            <BansalBadge tone="orange">
              <GraduationCap className="h-3 w-3 mr-1" /> AIR 1, single-digit ranks
            </BansalBadge>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-border bg-white py-6">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bansal-gray" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search alumni by name, company or rank…"
              className="w-full rounded-full border border-border bg-bansal-cream/40 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bansal-orange"
            />
          </div>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="rounded-full border border-border bg-bansal-cream/40 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bansal-orange"
          >
            <option value="all">All batches</option>
            {years.map((y) => (
              <option key={y} value={y}>
                Batch {y}
              </option>
            ))}
          </select>
          <span className="text-xs text-bansal-gray">{filtered.length} alumni</span>
        </div>
      </section>

      {/* Grid */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          {loading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-bansal-orange" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <GraduationCap className="mx-auto h-12 w-12 text-bansal-blue/30 mb-3" />
              <h3 className="font-display text-xl font-bold text-bansal-blue">No alumni found</h3>
              <p className="text-bansal-gray text-sm mt-1">
                Try a different search or batch year.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((a) => (
                <article
                  key={a.id}
                  className="group relative rounded-2xl border border-border bg-white p-5 hover:border-bansal-orange/40 hover:-translate-y-1 transition-all shadow-sm hover:shadow-xl"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 shrink-0 rounded-2xl overflow-hidden bg-gradient-to-br from-bansal-orange/15 to-bansal-blue/15 flex items-center justify-center ring-2 ring-bansal-orange/20">
                      {a.photo_url ? (
                        <img src={a.photo_url} alt={a.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-display text-xl font-extrabold text-bansal-blue">
                          {initialsOf(a.name)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-lg font-extrabold text-bansal-blue truncate">
                        {a.name}
                      </h3>
                      {a.rank && (
                        <div className="mt-0.5 text-xs font-bold text-bansal-orange uppercase tracking-wide">
                          {a.rank} {a.exam ? `· ${a.exam}` : ""}
                        </div>
                      )}
                      {(a.current_position || a.company) && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-bansal-gray">
                          <Building2 className="h-3 w-3 text-bansal-blue/60 shrink-0" />
                          <span className="truncate">
                            {a.current_position}
                            {a.current_position && a.company ? " · " : ""}
                            {a.company}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {a.quote && (
                    <p className="mt-4 text-sm text-bansal-gray italic leading-relaxed border-l-2 border-bansal-orange/40 pl-3">
                      &ldquo;{a.quote}&rdquo;
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between text-[11px] text-bansal-gray">
                    <span>Batch {a.batch_year ?? a.year ?? "—"}</span>
                    <span className="font-semibold text-bansal-blue/60 uppercase tracking-wide">
                      Bansalian
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-bansal-cream py-16">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold text-bansal-blue">
            Are you a <span className="text-bansal-orange">Bansalian</span>?
          </h2>
          <p className="mt-3 text-bansal-gray">
            Join the alumni network — share where you are today, mentor a current student, or
            return as guest faculty.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <Link to="/contact">
              <BansalButton variant="cta">Join Alumni Network</BansalButton>
            </Link>
            <Link to="/about">
              <BansalButton variant="ghost">Back to About</BansalButton>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
