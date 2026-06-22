import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { toast } from "sonner";

const STATUSES = ["new", "in_progress", "resolved", "closed"] as const;

const CenterWebsiteEnquiriesPage = () => {
  const { primaryCenterId } = useCenterAdmin();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!primaryCenterId) return;
    setLoading(true);
    let q = (supabase as any)
      .from("enquiries" as any)
      .select("*")
      .eq("centre_id" as any, primaryCenterId)
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [primaryCenterId, filter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("enquiries" as any).update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
  };

  if (!primaryCenterId) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  return (
    <div className="p-6 lg:p-8 space-y-4">
      <div>
        <h1 className="text-2xl font-black font-display text-foreground">Website Enquiries</h1>
        <p className="text-sm text-muted-foreground">Admission, course & general enquiries from your centre's public page.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
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

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No enquiries.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((e) => (
                  <tr key={e.id} className="border-t border-border align-top hover:bg-muted/30">
                    <td className="px-4 py-3 font-semibold text-foreground">{e.name}</td>
                    <td className="px-4 py-3 text-xs">{e.phone || "—"}</td>
                    <td className="px-4 py-3 text-xs capitalize">{e.category || "—"}</td>
                    <td className="px-4 py-3 text-xs">{e.class_level || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[320px]">
                      <div className="line-clamp-3 whitespace-pre-wrap">{e.message}</div>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <select
                        value={e.status}
                        onChange={(ev) => updateStatus(e.id, ev.target.value)}
                        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>{s.replace("_", " ")}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CenterWebsiteEnquiriesPage;
