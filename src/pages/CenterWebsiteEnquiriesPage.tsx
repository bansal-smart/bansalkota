import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { toast } from "sonner";
import { Mail, Phone, MessageSquare } from "lucide-react";

const STATUSES = ["new", "in_progress", "resolved", "closed"] as const;

const CenterWebsiteEnquiriesPage = () => {
  const { primaryCenterId } = useCenterAdmin();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!primaryCenterId) return;
    setLoading(true);
    let q = supabase.from("enquiries").select("*").eq("center_id" as any, primaryCenterId).order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [primaryCenterId, filter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("enquiries").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
  };

  if (!primaryCenterId) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  return (
    <div className="p-6 lg:p-8 space-y-4">
      <div>
        <h1 className="text-2xl font-black font-display text-foreground">Website Enquiries</h1>
        <p className="text-sm text-muted-foreground">Admission & general enquiries submitted via your centre's public page.</p>
      </div>

      <div className="flex gap-2">
        {["all", ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No enquiries.</p>
      ) : (
        <div className="space-y-3">
          {items.map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-foreground">{e.name}</p>
                  <p className="text-xs text-muted-foreground inline-flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{e.email}</span>
                    {e.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{e.phone}</span>}
                    <span>· {new Date(e.created_at).toLocaleString()}</span>
                  </p>
                </div>
                <select value={e.status} onChange={(ev) => updateStatus(e.id, ev.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-xs">
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
              </div>
              {e.message && (
                <p className="mt-3 text-sm text-foreground inline-flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <span>{e.message}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CenterWebsiteEnquiriesPage;
