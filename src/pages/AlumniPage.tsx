import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2, Search, Trophy, Building2, GraduationCap, Sparkles,
  Quote, ArrowRight, Send,
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BansalBadge from "@/components/bansal/BansalBadge";
import BansalButton from "@/components/bansal/BansalButton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type Alumnus = {
  id: string;
  name: string;
  rank_label: string | null;
  exam: string | null;
  year: number | null;
  photo_url: string | null;
  quote: string | null;
  story: string | null;
  current_position: string | null;
  company: string | null;
  batch_year: number | null;
  is_alumni: boolean;
  is_featured: boolean;
};

const initialsOf = (name: string) =>
  name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

const decadeOf = (y: number) => Math.floor(y / 10) * 10;
const decadeLabel = (d: number) => `${d}s`;

const submissionSchema = z.object({
  full_name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  batch_year: z.string().trim().regex(/^\d{4}$/, "4-digit year").optional().or(z.literal("")),
  exam: z.string().trim().max(40).optional().or(z.literal("")),
  rank_label: z.string().trim().max(80).optional().or(z.literal("")),
  current_position: z.string().trim().max(120).optional().or(z.literal("")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  linkedin_url: z.string().trim().url("Must be a URL").max(300).optional().or(z.literal("")),
  story: z.string().trim().min(40, "Tell us a bit more — at least 40 chars").max(2000),
});

export default function AlumniPage() {
  const [items, setItems] = useState<Alumnus[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [decadeFilter, setDecadeFilter] = useState<number | "all">("all");
  const [submitOpen, setSubmitOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("toppers")
        .select(
          "id,name,rank_label,exam,year,photo_url,quote,story,current_position,company,batch_year,is_alumni,is_featured",
        )
        .eq("is_alumni", true)
        .order("is_featured", { ascending: false })
        .order("batch_year", { ascending: false, nullsFirst: false })
        .order("year", { ascending: false })
        .limit(500);
      setItems((data ?? []) as Alumnus[]);
      setLoading(false);
    })();
  }, []);

  const featured = useMemo(
    () => items.filter((a) => a.is_featured).slice(0, 6),
    [items],
  );

  const years = useMemo(() => {
    const set = new Set<number>();
    items.forEach((a) => {
      const y = a.batch_year ?? a.year;
      if (y) set.add(y);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [items]);

  const decades = useMemo(() => {
    const set = new Set<number>();
    items.forEach((a) => {
      const y = a.batch_year ?? a.year;
      if (y) set.add(decadeOf(y));
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [items]);

  const byDecade = useMemo(() => {
    const map = new Map<number, Alumnus[]>();
    items.forEach((a) => {
      const y = a.batch_year ?? a.year;
      if (!y) return;
      const d = decadeOf(y);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(a);
    });
    return Array.from(map.entries()).sort((a, b) => b[0] - a[0]);
  }, [items]);

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    return items.filter((a) => {
      const y = a.batch_year ?? a.year;
      if (yearFilter !== "all" && String(y) !== yearFilter) return false;
      if (decadeFilter !== "all" && (!y || decadeOf(y) !== decadeFilter)) return false;
      if (!k) return true;
      const hay = `${a.name} ${a.current_position ?? ""} ${a.company ?? ""} ${a.exam ?? ""}`.toLowerCase();
      return hay.includes(k);
    });
  }, [items, q, yearFilter, decadeFilter]);

  return (
    <div className="bg-background">
      <AlumniHero onSubmit={() => setSubmitOpen(true)} />

      {/* Featured / Notable spotlight */}
      {featured.length > 0 && (
        <section className="py-16 md:py-20 bg-white border-b border-border">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="h-px w-10 bg-bansal-orange" />
                  <span className="text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold">
                    Notable Bansalians
                  </span>
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-extrabold text-bansal-blue">
                  The stories we tell at every reunion.
                </h2>
              </div>
              <p className="text-sm text-bansal-gray max-w-md">
                A handful of alumni whose work, in classrooms and boardrooms, in labs and launchpads,
                still echoes back to Kota.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((a) => (
                <article
                  key={a.id}
                  className="group relative overflow-hidden rounded-3xl border border-border bg-bansal-cream/30 p-6 hover:-translate-y-1 hover:shadow-2xl hover:border-bansal-orange/50 transition-all"
                >
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-bansal-orange/10 blur-2xl pointer-events-none" />
                  <Quote className="absolute right-5 top-5 h-7 w-7 text-bansal-orange/30" />
                  <div className="relative">
                    <div className="h-20 w-20 rounded-2xl overflow-hidden ring-4 ring-bansal-orange/20 bg-gradient-to-br from-bansal-orange/20 to-bansal-blue/20 flex items-center justify-center">
                      {a.photo_url ? (
                        <img src={a.photo_url} alt={a.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-display text-2xl font-extrabold text-bansal-blue">
                          {initialsOf(a.name)}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 font-display text-xl font-extrabold text-bansal-blue">
                      {a.name}
                    </h3>
                    {a.rank_label && (
                      <div className="mt-0.5 text-xs font-bold text-bansal-orange uppercase tracking-wide">
                        {a.rank_label} {a.exam ? `· ${a.exam}` : ""}
                      </div>
                    )}
                    {(a.current_position || a.company) && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-bansal-gray">
                        <Building2 className="h-3 w-3 text-bansal-blue/60 shrink-0" />
                        <span className="truncate">
                          {a.current_position}
                          {a.current_position && a.company ? " · " : ""}
                          {a.company}
                        </span>
                      </div>
                    )}
                    {(a.story || a.quote) && (
                      <p className="mt-4 text-sm text-bansal-gray leading-relaxed line-clamp-5">
                        {a.story || a.quote}
                      </p>
                    )}
                    <div className="mt-5 flex items-center justify-between text-[11px] text-bansal-gray">
                      <span>Batch {a.batch_year ?? a.year ?? "—"}</span>
                      <span className="font-semibold text-bansal-blue/60 uppercase tracking-wide">
                        Bansalian
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Decade timeline */}
      {byDecade.length > 0 && (
        <section className="py-16 md:py-20 bg-bansal-cream/40">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="h-px w-10 bg-bansal-orange" />
                <span className="text-bansal-orange uppercase tracking-[0.25em] text-xs font-bold">
                  Four decades, one classroom
                </span>
                <span className="h-px w-10 bg-bansal-orange" />
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-extrabold text-bansal-blue">
                The Bansal timeline.
              </h2>
              <p className="mt-3 text-bansal-gray max-w-2xl mx-auto text-sm md:text-base">
                Each decade brought a new generation of dreamers. Here are a few faces from each.
              </p>
            </div>

            <div className="relative">
              <div
                className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-bansal-orange/0 via-bansal-orange/40 to-bansal-orange/0 -translate-x-1/2"
                aria-hidden
              />
              <ol className="space-y-12 md:space-y-16">
                {byDecade.map(([decade, people], idx) => {
                  const side = idx % 2 === 0 ? "md:pr-12 md:text-right md:items-end" : "md:pl-12 md:ml-auto";
                  const dot = idx % 2 === 0 ? "md:right-[-7px]" : "md:left-[-7px]";
                  return (
                    <li key={decade} className="md:grid md:grid-cols-2 md:gap-0 relative">
                      <div className={`relative md:w-full ${idx % 2 === 0 ? "" : "md:col-start-2"} ${side}`}>
                        <div className={`hidden md:block absolute top-6 ${dot} h-3.5 w-3.5 rounded-full bg-bansal-orange ring-4 ring-bansal-cream`} />
                        <div className="bg-white rounded-3xl border border-border p-6 md:p-7 shadow-sm hover:shadow-xl hover:border-bansal-orange/40 transition-all">
                          <div className="flex items-baseline gap-3 flex-wrap">
                            <span className="font-display text-3xl md:text-4xl font-extrabold text-bansal-orange">
                              {decadeLabel(decade)}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-bansal-blue/60">
                              {people.length} alumni
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-bansal-gray">
                            {decade <= 1990 && "The founding generation — first IIT selections from Kota."}
                            {decade === 2000 && "Kota becomes a verb. Bansal alumni land top single-digit ranks."}
                            {decade === 2010 && "Bansalians spread across IITs, AIIMS, ISRO, IIMs and founders' desks."}
                            {decade >= 2020 && "A new wave — JEE Advanced, NEET UG, Olympiad winners and beyond."}
                          </p>
                          <div className="mt-5 flex flex-wrap gap-2">
                            {people.slice(0, 8).map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setDecadeFilter(decade);
                                  setYearFilter("all");
                                  setQ(p.name);
                                  document.getElementById("alumni-directory")?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="group/chip inline-flex items-center gap-1.5 rounded-full border border-bansal-orange/20 bg-bansal-cream/40 px-3 py-1 text-xs text-bansal-blue hover:border-bansal-orange/60 hover:bg-bansal-orange/10 transition"
                                title={`${p.name}${p.rank_label ? ` · ${p.rank_label}` : ""}`}
                              >
                                <span className="font-semibold">{p.name}</span>
                                {p.rank_label && (
                                  <span className="text-bansal-orange font-bold">· {p.rank_label}</span>
                                )}
                              </button>
                            ))}
                            {people.length > 8 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDecadeFilter(decade);
                                  setYearFilter("all");
                                  setQ("");
                                  document.getElementById("alumni-directory")?.scrollIntoView({ behavior: "smooth" });
                                }}
                                className="inline-flex items-center gap-1 rounded-full bg-bansal-blue text-white px-3 py-1 text-xs font-semibold hover:bg-bansal-blue-dark"
                              >
                                +{people.length - 8} more <ArrowRight className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </section>
      )}

      {/* Directory — search + filters + grid */}
      <section id="alumni-directory" className="border-b border-border bg-white py-6">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl flex flex-wrap gap-3 items-center">
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
            value={decadeFilter === "all" ? "all" : String(decadeFilter)}
            onChange={(e) => setDecadeFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="rounded-full border border-border bg-bansal-cream/40 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bansal-orange"
          >
            <option value="all">All decades</option>
            {decades.map((d) => (
              <option key={d} value={d}>{decadeLabel(d)}</option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="rounded-full border border-border bg-bansal-cream/40 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bansal-orange"
          >
            <option value="all">All batches</option>
            {years.map((y) => (
              <option key={y} value={y}>Batch {y}</option>
            ))}
          </select>
          <span className="text-xs text-bansal-gray">{filtered.length} alumni</span>
        </div>
      </section>

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
              <p className="text-bansal-gray text-sm mt-1">Try a different search or batch year.</p>
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
                      {a.rank_label && (
                        <div className="mt-0.5 text-xs font-bold text-bansal-orange uppercase tracking-wide">
                          {a.rank_label} {a.exam ? `· ${a.exam}` : ""}
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
                    <p className="mt-4 text-sm text-bansal-gray italic leading-relaxed border-l-2 border-bansal-orange/40 pl-3 line-clamp-3">
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
            Share your story, mentor a current student, or return as guest faculty.
            Every story you send goes straight to our alumni desk.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <BansalButton variant="cta" onClick={() => setSubmitOpen(true)}>
              <Send className="h-4 w-4 mr-1.5" /> Submit your story
            </BansalButton>
            <Link to="/about">
              <BansalButton variant="outline">Back to About</BansalButton>
            </Link>
          </div>
        </div>
      </section>

      <SubmitStoryDialog open={submitOpen} onOpenChange={setSubmitOpen} />
    </div>
  );
}

function AlumniHero({ onSubmit }: { onSubmit: () => void }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-bansal-blue via-bansal-blue to-bansal-blue-dark text-white py-16 md:py-24">
      <div className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-bansal-orange/25 blur-3xl pointer-events-none" />
      <div className="absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-bansal-orange/15 blur-3xl pointer-events-none" />
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
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={onSubmit}
            className="inline-flex items-center gap-2 rounded-full bg-bansal-orange px-5 py-2.5 text-sm font-bold text-white hover:bg-bansal-orange/90 transition"
          >
            <Send className="h-4 w-4" /> Submit your story
          </button>
          <a
            href="#alumni-directory"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition"
          >
            Browse directory <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function SubmitStoryDialog({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", batch_year: "", exam: "",
    rank_label: "", current_position: "", company: "", city: "",
    linkedin_url: "", story: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const parsed = submissionSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Please check the form");
      return;
    }
    setSaving(true);
    const v = parsed.data;
    const { error } = await supabase.from("alumni_submissions").insert({
      full_name: v.full_name,
      email: v.email,
      phone: v.phone || null,
      batch_year: v.batch_year ? Number(v.batch_year) : null,
      exam: v.exam || null,
      rank_label: v.rank_label || null,
      current_position: v.current_position || null,
      company: v.company || null,
      city: v.city || null,
      linkedin_url: v.linkedin_url || null,
      story: v.story,
    });
    setSaving(false);
    if (error) {
      toast.error("Couldn't submit your story. Please try again.");
      return;
    }
    toast.success("Thank you! Your story has been sent to the alumni desk.");
    setForm({
      full_name: "", email: "", phone: "", batch_year: "", exam: "",
      rank_label: "", current_position: "", company: "", city: "",
      linkedin_url: "", story: "",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-bansal-blue">
            Submit your alumni story
          </DialogTitle>
          <DialogDescription>
            Your story is reviewed by our alumni desk before being added to the wall.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <Field label="Full name *" value={form.full_name} onChange={(v) => set("full_name", v)} />
          <Field label="Email *" value={form.email} onChange={(v) => set("email", v)} type="email" />
          <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
          <Field label="Batch year" value={form.batch_year} onChange={(v) => set("batch_year", v)} placeholder="e.g. 2008" />
          <Field label="Exam" value={form.exam} onChange={(v) => set("exam", v)} placeholder="JEE / NEET" />
          <Field label="Rank / Score" value={form.rank_label} onChange={(v) => set("rank_label", v)} placeholder="AIR 47" />
          <Field label="Current role" value={form.current_position} onChange={(v) => set("current_position", v)} />
          <Field label="Company / Institute" value={form.company} onChange={(v) => set("company", v)} />
          <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
          <Field label="LinkedIn URL" value={form.linkedin_url} onChange={(v) => set("linkedin_url", v)} placeholder="https://…" />
        </div>

        <div className="mt-4">
          <Label className="text-sm font-semibold text-bansal-blue">Your story *</Label>
          <Textarea
            value={form.story}
            onChange={(e) => set("story", e.target.value)}
            placeholder="From Bansal Kota to where you are today — what shaped you?"
            rows={6}
            className="mt-1.5"
          />
          <p className="text-[11px] text-bansal-gray mt-1">{form.story.length}/2000</p>
        </div>

        <DialogFooter className="mt-4">
          <BansalButton variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </BansalButton>
          <BansalButton variant="cta" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
            Send story
          </BansalButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold text-bansal-blue uppercase tracking-wide">{label}</Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5"
      />
    </div>
  );
}
