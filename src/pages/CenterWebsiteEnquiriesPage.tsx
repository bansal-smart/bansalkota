import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download, ArrowUpDown } from "lucide-react";
import { exportCsv } from "@/lib/exportCsv";



const STATUSES = ["new", "in_progress", "resolved", "closed"] as const;

type SortDir = "asc" | "desc" | null;

const CenterWebsiteEnquiriesPage = () => {
  const { primaryCenterId } = useCenterAdmin();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [sortDir, setSortDir] = useState<SortDir>(null);

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

  const handleExport = () => {
    if (items.length === 0) return toast.error("No enquiries to export");
    exportCsv("centre-website-enquiries", items, [
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "category", label: "Type" },
      { key: "class_level", label: "Class" },
      { key: "message", label: "Description" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Submitted", value: (r) => new Date(r.created_at).toLocaleString() },
    ]);
  };

  const toggleSortByType = () => {
    setSortDir((prev) => (prev === null ? "asc" : prev === "asc" ? "desc" : null));
  };

  const sortedItems = useMemo(() => {
    if (!sortDir) return items;
    const sorted = [...items];
    sorted.sort((a, b) => {
      const aVal = (a.category || "").toLowerCase();
      const bVal = (b.category || "").toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [items, sortDir]);

  const sortLabel = sortDir === null ? "Sort by Type" : sortDir === "asc" ? "Type: A → Z" : "Type: Z → A";

  if (!primaryCenterId) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  return (
    <div className="p-6 lg:p-8 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black font-display text-foreground">Website Enquiries</h1>
          <p className="text-sm text-muted-foreground">Admission, course & general enquiries from your centre's public page.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={items.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>


      <div className="flex gap-2 flex-wrap items-center">
        {["all", ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${filter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
        <button
          onClick={toggleSortByType}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${sortDir ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"}`}
        >
          <ArrowUpDown className="h-3 w-3" />
          {sortLabel}
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {loading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : sortedItems.length === 0 ? (
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
                {sortedItems.map((e) => (
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
