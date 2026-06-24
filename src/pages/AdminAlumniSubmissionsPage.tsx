import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Loader2, Search, CheckCircle2, XCircle, Trash2, Star, Inbox,
  ExternalLink, GraduationCap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useConfirm } from "@/components/ConfirmDialog";

type Submission = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  batch_year: number | null;
  exam: string | null;
  rank_label: string | null;
  current_position: string | null;
  company: string | null;
  city: string | null;
  story: string;
  photo_url: string | null;
  linkedin_url: string | null;
  status: "pending" | "approved" | "rejected" | "published";
  admin_notes: string | null;
  published_topper_id: string | null;
  created_at: string;
  reviewed_at: string | null;
};

const statusStyle: Record<string, string> = {
  pending: "bg-warning/15 text-warning border-warning/30",
  approved: "bg-primary/15 text-primary border-primary/30",
  published: "bg-secondary/15 text-secondary border-secondary/30",
  rejected: "bg-muted text-muted-foreground border-border",
};

export default function AdminAlumniSubmissionsPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [active, setActive] = useState<Submission | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("alumni_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Submission[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    setNotes(active?.admin_notes ?? "");
  }, [active]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!k) return true;
      return `${r.full_name} ${r.email} ${r.company ?? ""} ${r.current_position ?? ""}`
        .toLowerCase().includes(k);
    });
  }, [rows, search, statusFilter]);

  const setStatus = async (id: string, status: Submission["status"], extra?: Partial<Submission>) => {
    setBusy(id);
    const { error } = await supabase
      .from("alumni_submissions")
      .update({
        status,
        admin_notes: notes || null,
        reviewed_at: new Date().toISOString(),
        ...extra,
      })
      .eq("id", id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marked as ${status}`);
    await load();
    setActive(null);
  };

  const promoteToTopper = async (s: Submission, featured: boolean) => {
    setBusy(s.id);
    const { data: t, error } = await supabase
      .from("toppers")
      .insert({
        name: s.full_name,
        exam: s.exam ?? "JEE",
        rank_label: s.rank_label ?? null,
        year: s.batch_year ?? null,
        batch_year: s.batch_year ?? null,
        city: s.city ?? null,
        photo_url: s.photo_url ?? null,
        story: s.story,
        quote: s.story.length > 220 ? s.story.slice(0, 217) + "…" : s.story,
        current_position: s.current_position ?? null,
        company: s.company ?? null,
        is_alumni: true,
        is_featured: featured,
        is_published: true,
        sort_order: 0,
      })
      .select("id")
      .single();
    if (error || !t) { setBusy(null); toast.error(error?.message ?? "Failed"); return; }
    await setStatus(s.id, "published", { published_topper_id: t.id });
    setBusy(null);
  };

  const remove = async (id: string) => {
    const ok = await confirm({
      title: "Delete submission?",
      description: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    const { error } = await supabase.from("alumni_submissions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    await load();
    setActive(null);
  };

  const counts = useMemo(() => ({
    all: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    published: rows.filter((r) => r.status === "published").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  }), [rows]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-bansal-blue flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-bansal-orange" />
          Alumni Story Submissions
        </h1>
        <p className="text-sm text-bansal-gray mt-1">
          Stories submitted by Bansalites on the public Alumni page. Approve to publish into the Toppers wall.
        </p>
      </header>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bansal-gray" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, company…"
            className="pl-10"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "pending", "approved", "published", "rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full border font-semibold uppercase tracking-wide ${
                statusFilter === s
                  ? "bg-bansal-blue text-white border-bansal-blue"
                  : "bg-white text-bansal-gray border-border hover:border-bansal-blue/40"
              }`}
            >
              {s} <span className="ml-1 opacity-70">({counts[s as keyof typeof counts]})</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-bansal-orange" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-bansal-cream/30">
          <Inbox className="mx-auto h-10 w-10 text-bansal-blue/30 mb-2" />
          <p className="text-bansal-gray text-sm">No submissions match these filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-bansal-cream/40 text-xs uppercase tracking-wider text-bansal-blue/70">
              <tr>
                <th className="text-left px-4 py-3">Alumnus</th>
                <th className="text-left px-4 py-3">Batch</th>
                <th className="text-left px-4 py-3">Now</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Received</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-bansal-cream/20">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-bansal-blue">{r.full_name}</div>
                    <div className="text-xs text-bansal-gray">{r.email}</div>
                  </td>
                  <td className="px-4 py-3 text-bansal-gray">
                    {r.batch_year ?? "—"}{r.rank_label ? ` · ${r.rank_label}` : ""}
                  </td>
                  <td className="px-4 py-3 text-bansal-gray">
                    {[r.current_position, r.company].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusStyle[r.status]}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-bansal-gray">
                    {format(new Date(r.created_at), "dd MMM yyyy")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setActive(r)}>
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-xl text-bansal-blue">
                  {active.full_name}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-3 text-sm">
                <Row label="Email" value={active.email} />
                {active.phone && <Row label="Phone" value={active.phone} />}
                <Row label="Batch" value={active.batch_year ? String(active.batch_year) : "—"} />
                {active.exam && <Row label="Exam" value={active.exam} />}
                {active.rank_label && <Row label="Rank" value={active.rank_label} />}
                {active.current_position && <Row label="Role" value={active.current_position} />}
                {active.company && <Row label="Company" value={active.company} />}
                {active.city && <Row label="City" value={active.city} />}
                {active.linkedin_url && (
                  <Row
                    label="LinkedIn"
                    value={
                      <a
                        href={active.linkedin_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-bansal-orange inline-flex items-center gap-1 hover:underline"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    }
                  />
                )}

                <div>
                  <div className="text-xs uppercase tracking-wide text-bansal-blue/70 font-bold mb-1">
                    Story
                  </div>
                  <p className="rounded-xl bg-bansal-cream/40 border border-border p-4 leading-relaxed whitespace-pre-wrap">
                    {active.story}
                  </p>
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wide text-bansal-blue/70 font-bold mb-1">
                    Admin notes
                  </div>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Internal notes for the alumni desk…"
                    rows={3}
                  />
                </div>

                <div className="pt-3 border-t border-border flex flex-wrap gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => remove(active.id)}
                    disabled={busy === active.id}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatus(active.id, "rejected")}
                    disabled={busy === active.id}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" /> Reject
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStatus(active.id, "approved")}
                    disabled={busy === active.id || active.status === "published"}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => promoteToTopper(active, false)}
                    disabled={busy === active.id || active.status === "published"}
                    className="bg-bansal-blue hover:bg-bansal-blue-dark"
                  >
                    {busy === active.id ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                    Publish to Alumni
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => promoteToTopper(active, true)}
                    disabled={busy === active.id || active.status === "published"}
                    className="bg-bansal-orange hover:bg-bansal-orange/90"
                  >
                    <Star className="h-4 w-4 mr-1.5" /> Publish as Featured
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      {ConfirmDialog}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="text-xs uppercase tracking-wide text-bansal-blue/70 font-bold">{label}</div>
      <div className="col-span-2 text-bansal-blue">{value}</div>
    </div>
  );
}
