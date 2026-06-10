import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUSES = ["new", "in_progress", "resolved", "closed"] as const;

const AdminCenterSupportPage = () => {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("enquiries")
      .select("*, center:centers(id, slug, city, area, state)")
      .eq("source", "center_support")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [filter]);

  const saveReply = async (id: string, status?: string) => {
    setSavingId(id);
    const payload: any = {};
    if (replyDrafts[id] !== undefined) payload.staff_notes = replyDrafts[id];
    if (status) payload.status = status;
    const { error } = await supabase.from("enquiries").update(payload).eq("id", id);
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
      <div className="flex gap-2 flex-wrap">
        {["all", ...STATUSES].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1 text-xs font-medium ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tickets.</p>
      ) : (
        <div className="space-y-3">
          {items.map((t) => {
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
