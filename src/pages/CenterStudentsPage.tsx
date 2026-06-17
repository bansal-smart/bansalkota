import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";

const CenterStudentsPage = () => {
  const { primaryCenterId } = useCenterAdmin();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!primaryCenterId) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, phone, target_exam, class_level, city, created_at")
        .eq("center_id", primaryCenterId)
        .order("created_at", { ascending: false });
      setItems(data ?? []);
      setLoading(false);
    })();
  }, [primaryCenterId]);

  if (!primaryCenterId) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  const filtered = items.filter((s) =>
    !q || (s.full_name || "").toLowerCase().includes(q.toLowerCase()) || (s.phone || "").includes(q)
  );

  const exportCsv = () => {
    const header = ["Name", "Phone", "Class", "Target Exam", "City", "Joined"];
    const lines = filtered.map((s) =>
      [s.full_name, s.phone, s.class_level, s.target_exam, s.city, new Date(s.created_at).toISOString()]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `centre-students-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 lg:p-8 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black font-display text-foreground">My Students</h1>
          <p className="text-sm text-muted-foreground">Students who selected your centre during signup.</p>
        </div>
        <button onClick={exportCsv} className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold hover:bg-muted">
          Export CSV ({filtered.length})
        </button>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or phone" className="w-full sm:w-72 rounded-md border border-border bg-background px-3 py-2 text-sm" />

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-4 py-2 font-bold">Name</th>
                <th className="px-4 py-2 font-bold">Phone</th>
                <th className="px-4 py-2 font-bold">Class</th>
                <th className="px-4 py-2 font-bold">Target</th>
                <th className="px-4 py-2 font-bold">City</th>
                <th className="px-4 py-2 font-bold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-2 text-foreground">{s.full_name || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.phone || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.class_level || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.target_exam || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.city || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No students mapped yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CenterStudentsPage;
