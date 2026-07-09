import { useEffect, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUSES = ["new", "in_progress", "resolved", "closed"] as const;

type CentreOpt = { id: string; city: string; area: string | null };

const AdminCenterSupportPage = () => {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [centres, setCentres] = useState<CentreOpt[]>([]);
  const [centreFilter, setCentreFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("enquiries" as any)
      .select("*, center:centres(id, slug, city, area, state)")
      .eq("source", "center_support")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const [{ data }, { data: cData }] = await Promise.all([
      q,
      supabase.from("centres").select("id, city, area").order("city"),
    ]);
    setItems(data ?? []);
    setCentres((cData as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  // Centre users only ever see their own centre's tickets (RLS-scoped), so
  // this filter is only meaningful — and only rendered — for admin/super_admin
  // viewing across every centre.
  const filteredItems = useMemo(() => {
    if (centreFilter === "all") return items;
    return items.filter((t) => t.centre_id === centreFilter);
  }, [items, centreFilter]);
  const distinctCentreIds = useMemo(() => new Set(items.map((t) => t.centre_id).filter(Boolean)), [items]);
  const showCentreFilter = distinctCentreIds.size > 1;

  const saveReply = async (id: string, status?: string) => {
    setSavingId(id);
    const payload: any = {};
    if (replyDrafts[id] !== undefined) payload.staff_notes = replyDrafts[id];
    if (status) payload.status = status;
    const { error } = await (supabase as any).from("enquiries" as any).update(payload).eq("id", id);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
  };

  return (
    <div className="p-6 lg:p-8 space-y-4">
      <div>
        <h1 className="text-2xl font-black font-display text-foreground">Centre Complaints & Support</h1>
        <p className="text-sm text-muted-foreground">Tickets raised by centre admins. Reply via Staff Notes; the centre sees your reply on their panel.</p>
      </div>
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {["all", ...STATUSES].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
        {showCentreFilter && (
          <Select value={centreFilter} onValueChange={setCentreFilter}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="All centres" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All centres</SelectItem>
              {centres.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.city}{c.area && c.area !== c.city ? ` — ${c.area}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : filteredItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tickets.</p>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((t) => {
            const subj = (t.message || "").split("\n")[0].replace(/^\[|\]$/g, "");
            const body = (t.message || "").split("\n").slice(1).join("\n");
            return (
              <div key={t.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{subj}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.center?.city || "Unknown centre"} · {t.priority || "normal"} · {t.category || "general"} · {new Date(t.created_at).toLocaleString()}
                    </p>
                  </div>
                  <select value={t.status} onChange={(e) => saveReply(t.id, e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-xs">
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
                <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{body}</p>
                <div className="mt-3">
                  <label className="text-xs font-bold text-foreground">Reply</label>
                  <textarea
                    value={replyDrafts[t.id] ?? t.staff_notes ?? ""}
                    onChange={(e) => setReplyDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Write a reply for the centre admin…"
                  />
                  <button onClick={() => saveReply(t.id)} disabled={savingId === t.id} className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                    {savingId === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save Reply
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminCenterSupportPage;
