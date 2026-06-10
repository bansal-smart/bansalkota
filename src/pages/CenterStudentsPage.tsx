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
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, phone, target_exam, class_level, city, created_at")
        .eq("center_id" as any, primaryCenterId)
        .order("created_at", { ascending: false });
      setItems(data ?? []);
      setLoading(false);
    })();
  }, [primaryCenterId]);

  if (!primaryCenterId) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  const filtered = items.filter((s) =>
    !q || (s.full_name || "").toLowerCase().includes(q.toLowerCase()) || (s.phone || "").includes(q)
  );

  return (
    <div className="p-6 lg:p-8 space-y-4">
      <div>
        <h1 className="text-2xl font-black font-display text-foreground">My Students</h1>
        <p className="text-sm text-muted-foreground">Students who selected your centre during signup.</p>
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
