import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";

const STATUSES = ["new", "in_progress", "resolved", "closed"] as const;
const CATEGORIES = ["general", "technical", "billing", "students", "other"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

type CentreOpt = { id: string; city: string; area: string | null };

const AdminCenterSupportPage = () => {
  const { isCenterAdmin, user } = useAuth();
  const { primaryCenterId, loading: centreLoading } = useCenterAdmin();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [centres, setCentres] = useState<CentreOpt[]>([]);
  const [centreFilter, setCentreFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [priority, setPriority] = useState<string>("normal");
  const [submitting, setSubmitting] = useState(false);

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

  const submitTicket = async () => {
    if (!subject.trim() || !body.trim()) return toast.error("Subject and message are required");
    if (!primaryCenterId) return toast.error("Could not resolve your centre — contact Bansal HQ");
    setSubmitting(true);
    const { error } = await (supabase as any).from("enquiries" as any).insert({
      name: user?.email ?? "Centre admin",
      email: user?.email ?? null,
      message: `[${subject.trim()}]\n${body.trim()}`,
      source: "center_support",
      source_type: "center_support",
      centre_id: primaryCenterId,
      priority,
      category,
      status: "new",
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Ticket sent to Bansal HQ");
    setSubject("");
    setBody("");
    setCategory("general");
    setPriority("normal");
    load();
  };

  return (
    <div className="p-6 lg:p-8 space-y-4">
      <div>
        <h1 className="text-2xl font-black font-display text-foreground">Centre Complaints & Support</h1>
        <p className="text-sm text-muted-foreground">Tickets raised by centre admins. Reply via Staff Notes; the centre sees your reply on their panel.</p>
      </div>

      {isCenterAdmin && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-bold text-foreground">Raise a new ticket to Bansal HQ</h2>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="flex gap-2 flex-wrap">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Describe the issue…"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={submitTicket}
            disabled={submitting || centreLoading}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Send Ticket
          </button>
        </div>
      )}

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
                  {isCenterAdmin ? (
                    <span className="rounded-md border border-border bg-muted px-2 py-1 text-xs capitalize">{t.status.replace("_", " ")}</span>
                  ) : (
                    <select value={t.status} onChange={(e) => saveReply(t.id, e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-xs">
                      {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                    </select>
                  )}
                </div>
                <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{body}</p>
                {isCenterAdmin ? (
                  <div className="mt-3">
                    <label className="text-xs font-bold text-foreground">Reply from Bansal HQ</label>
                    {t.staff_notes ? (
                      <p className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">{t.staff_notes}</p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground italic">Awaiting a reply…</p>
                    )}
                  </div>
                ) : (
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminCenterSupportPage;
