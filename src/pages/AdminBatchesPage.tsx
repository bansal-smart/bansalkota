import { useEffect, useState } from "react";
import { Loader2, Plus, Users, Trash2, Globe, Copy, Pencil, Info, X, Search, Ban } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CBT_KIOSK_URL, SECRET_ADMIN_URL } from "@/lib/brand";
import { useAuth } from "@/context/AuthContext";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { scopeQueryToCentre } from "@/lib/centreScope";
import { filterBatchesForCentre, type BatchVisibility } from "@/lib/batchVisibility";
import { copyToClipboard } from "@/lib/clipboard";

type CourseRow = { id: string; name: string; slug: string };
type BatchRow = {
  id: string;
  code: string;
  name: string;
  class_level: string | null;
  is_active: boolean;
  course_id: string;
  centre_id: string | null;
  centre: { id: string; city: string; area: string | null; is_hq: boolean } | null;
  visibility: BatchVisibility;
};
type CentreLite = { id: string; city: string; area: string | null; is_hq: boolean };

const CLASS_OPTIONS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"];

const centreLabel = (centre: { city: string; area: string | null; is_hq: boolean } | null) =>
  centre
    ? centre.is_hq
      ? "Kota HQ"
      : `${centre.city}${centre.area && centre.area !== centre.city ? " — " + centre.area : ""}`
    : "No centre";

// Searchable checklist of centres, used by both the create form and the edit
// modal when visibility is set to "Centre Specific". 80+ centres is too many
// for a plain <select multiple>, so this is a filter input over checkboxes.
const CentreMultiSelect = ({
  centres,
  selected,
  onChange,
}: {
  centres: CentreLite[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) => {
  const [query, setQuery] = useState("");
  const filtered = centres.filter((c) =>
    centreLabel(c).toLowerCase().includes(query.trim().toLowerCase()),
  );
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border px-2.5 py-1.5">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${centres.length} centres…`}
          className="w-full bg-transparent text-xs outline-none"
        />
      </div>
      <div className="max-h-40 overflow-y-auto p-1.5">
        {filtered.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">No centres match.</p>
        ) : (
          filtered.map((c) => (
            <label key={c.id} className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted cursor-pointer">
              <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
              {centreLabel(c)}
            </label>
          ))
        )}
      </div>
      <p className="border-t border-border px-2.5 py-1 text-[10px] text-muted-foreground">
        {selected.length} centre{selected.length === 1 ? "" : "s"} selected
      </p>
    </div>
  );
};

const VisibilityPill = ({ visibility, centreCount }: { visibility: BatchVisibility; centreCount: number }) => {
  if (visibility === "disabled") {
    return (
      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
        <Ban className="h-2.5 w-2.5" /> Disabled
      </span>
    );
  }
  if (visibility === "centre_specific") {
    return (
      <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700">
        Centre Specific ({centreCount})
      </span>
    );
  }
  return (
    <span title="Available to all centres" className="ml-2 rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-700">
      PAN India
    </span>
  );
};

const AdminBatchesPage = () => {
  const { isStaff, isSuperAdmin, isCenterAdmin } = useAuth();
  const { isHq, primaryCenterId, loading: centreLoading } = useCenterAdmin();
  const canManageBatches = isStaff || isHq;
  // Batch codes (XI-J, XI-N …) repeat identically across every franchise
  // centre, so an unscoped list is not just noisy — it makes two different
  // centres' batches indistinguishable in the UI.
  const scopeCentreId = isCenterAdmin ? primaryCenterId : null;
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [centres, setCentres] = useState<CentreLite[]>([]);
  const [batchCentreMap, setBatchCentreMap] = useState<Map<string, string[]>>(new Map());
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Only isStaff (admin/super_admin) can write batch_centre_visibility (RLS:
  // "Admins manage batch centre visibility" = is_admin_or_super) — HQ centre
  // staff can manage their own batches' basic fields via canManageBatches,
  // but granting cross-centre reach is a portal-wide call, not a per-centre one.
  const canManageVisibility = isStaff;

  const [form, setForm] = useState<{
    courseId: string; code: string; name: string; class_level: string;
    visibility: BatchVisibility; visibilityCentreIds: string[];
  }>({ courseId: "", code: "", name: "", class_level: "XI", visibility: "global", visibilityCentreIds: [] });
  const [editing, setEditing] = useState<(BatchRow & { visibilityCentreIds: string[] }) | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [orphanCentreKey, setOrphanCentreKey] = useState<string>("");

  const openEdit = (b: BatchRow) => setEditing({ ...b, visibilityCentreIds: batchCentreMap.get(b.id) ?? [] });

  const load = async () => {
    setLoading(true);
    const [{ data: cs }, { data: bsRaw }, { data: bcv }, { data: cents }] = await Promise.all([
      scopeQueryToCentre(supabase.from("courses").select("id, name, slug"), scopeCentreId, { globalFlagColumn: "is_global" }).order("name"),
      // Visibility (global / centre_specific / disabled) replaces the old
      // centre_id-only OR-filter here — RLS already keeps disabled/inactive
      // rows away from non-admin callers, and filterBatchesForCentre below
      // handles the centre_specific allow-list, which RLS doesn't attempt.
      supabase.from("course_batches").select("*, centre:centres(id, city, area, is_hq)").order("code"),
      supabase.from("batch_centre_visibility").select("batch_id, centre_id"),
      supabase.from("centres").select("id, city, area, is_hq").order("city"),
    ]);
    setCourses((cs ?? []) as CourseRow[]);
    setBatches(await filterBatchesForCentre((bsRaw ?? []) as unknown as BatchRow[], scopeCentreId));

    const map = new Map<string, string[]>();
    (bcv ?? []).forEach((r: { batch_id: string; centre_id: string }) => {
      map.set(r.batch_id, [...(map.get(r.batch_id) ?? []), r.centre_id]);
    });
    setBatchCentreMap(map);
    setCentres((cents ?? []) as CentreLite[]);

    const { data: profs } = await supabase
      .from("profiles")
      .select("batch_id")
      .not("batch_id", "is", null);
    const counts: Record<string, number> = {};
    (profs ?? []).forEach((p: { batch_id: string | null }) => {
      if (!p.batch_id) return;
      counts[p.batch_id] = (counts[p.batch_id] ?? 0) + 1;
    });
    setStudentCounts(counts);
    setLoading(false);
  };

  useEffect(() => {
    // Don't fire an unscoped first load before the centre is known.
    if (isCenterAdmin && centreLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCenterAdmin, centreLoading, scopeCentreId]);

  const createBatch = async () => {
    if (!form.courseId || !form.code) return toast.error("Course and code are required");
    const { data: created, error } = await supabase.from("course_batches").insert({
      course_id: form.courseId,
      code: form.code.trim(),
      name: form.name.trim() || form.code.trim(),
      class_level: form.class_level || null,
      is_active: true,
      visibility: form.visibility,
    }).select("id").single();
    if (error) return toast.error(error.message);
    if (form.visibility === "centre_specific" && form.visibilityCentreIds.length) {
      const { error: vErr } = await supabase.from("batch_centre_visibility").insert(
        form.visibilityCentreIds.map((centre_id) => ({ batch_id: created.id, centre_id })),
      );
      if (vErr) return toast.error(vErr.message);
    }
    toast.success("Batch created");
    setForm({ courseId: "", code: "", name: "", class_level: "XI", visibility: "global", visibilityCentreIds: [] });
    load();
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.course_id || !editing.code.trim()) return toast.error("Course and code are required");
    setSavingEdit(true);
    const { error } = await supabase.from("course_batches")
      .update({
        course_id: editing.course_id,
        code: editing.code.trim(),
        name: editing.name.trim() || editing.code.trim(),
        class_level: editing.class_level,
        is_active: editing.is_active,
        visibility: editing.visibility,
      })
      .eq("id", editing.id);
    if (error) {
      setSavingEdit(false);
      return toast.error(error.message);
    }
    if (canManageVisibility) {
      const { error: delErr } = await supabase.from("batch_centre_visibility").delete().eq("batch_id", editing.id);
      if (delErr) {
        setSavingEdit(false);
        return toast.error(delErr.message);
      }
      if (editing.visibility === "centre_specific" && editing.visibilityCentreIds.length) {
        const { error: insErr } = await supabase.from("batch_centre_visibility").insert(
          editing.visibilityCentreIds.map((centre_id) => ({ batch_id: editing.id, centre_id })),
        );
        if (insErr) {
          setSavingEdit(false);
          return toast.error(insErr.message);
        }
      }
    }
    setSavingEdit(false);
    toast.success("Batch updated");
    setEditing(null);
    load();
  };

  const deleteBatch = async (id: string) => {
    if (!confirm("Delete this batch? Students tagged to it will be untagged.")) return;
    const { error } = await supabase.from("course_batches").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  // Group batches by course for display
  const grouped = courses
    .map((c) => ({ course: c, items: batches.filter((b) => b.course_id === c.id) }))
    .filter((g) => g.items.length > 0);
  const orphans = batches.filter((b) => !courses.find((c) => c.id === b.course_id));

  // Auto-created franchise batches all share the same codes (XI-J, XI-N …),
  // so an unscoped flat list of orphans made every centre's batch look like
  // the same row repeated dozens of times. Group by centre and let the admin
  // pick one centre from a dropdown instead of scrolling past 80 cards.
  const orphansByCentre = new Map<string, { key: string; label: string; items: BatchRow[] }>();
  for (const b of orphans) {
    const key = b.centre_id ?? "none";
    if (!orphansByCentre.has(key)) orphansByCentre.set(key, { key, label: centreLabel(b.centre), items: [] });
    orphansByCentre.get(key)!.items.push(b);
  }
  const orphanGroups = Array.from(orphansByCentre.values()).sort((a, b) => a.label.localeCompare(b.label));
  const activeOrphanGroup = orphanGroups.find((g) => g.key === orphanCentreKey) ?? orphanGroups[0] ?? null;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Course Batches</h1>
        <p className="text-xs text-muted-foreground">Each batch belongs to a course. A single course can have many batches. Used for offline cohorts, CBT gating, and reporting.</p>
      </div>

      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="text-xs text-foreground">
          To enrol students into batches in bulk, go to{" "}
          <Link to="/admin/students" className="font-bold text-primary underline">Students → Bulk Import</Link>
          {" "}and include a <code className="rounded bg-background px-1 py-0.5 font-mono">batch_code</code> column matching the batch codes below.
        </div>
      </div>

      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold uppercase tracking-wider text-primary">CBT Kiosk Link</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-foreground truncate">{CBT_KIOSK_URL}</p>
            <p className="text-[10px] text-muted-foreground">Single fixed link for all CBT tests</p>
          </div>
          <button
            onClick={() => copyToClipboard(CBT_KIOSK_URL, "Kiosk link copied")}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 inline-flex items-center gap-1.5 shrink-0">
            <Copy className="h-3.5 w-3.5" /> Copy Link
          </button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">Open this URL on lab computers in kiosk mode. Students log in with their roll number + mobile and see every live CBT test for their batch.</p>
      </div>

      {isSuperAdmin && (
        <div className="rounded-2xl border border-bansal-navy/30 bg-bansal-navy/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-bansal-navy" />
            <p className="text-xs font-bold uppercase tracking-wider text-bansal-navy">Secret Admin URL · super_admin only</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-foreground truncate">{SECRET_ADMIN_URL}</p>
              <p className="text-[10px] text-muted-foreground">Hidden command-centre entry — not linked anywhere public.</p>
            </div>
            <button
              onClick={() => copyToClipboard(SECRET_ADMIN_URL, "Secret URL copied")}
              className="rounded-lg bg-bansal-navy px-3 py-2 text-xs font-bold text-white hover:opacity-90 inline-flex items-center gap-1.5 shrink-0">
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
        </div>
      )}

      {canManageBatches && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold text-foreground mb-3">Add a new batch</p>
          <div className="grid md:grid-cols-5 gap-3">
            <select
              value={form.courseId}
              onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Course…</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Code e.g. XI-J1" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Display name (optional)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <select value={form.class_level} onChange={(e) => setForm({ ...form, class_level: e.target.value })}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={createBatch}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground inline-flex items-center justify-center gap-1 hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> Create batch
            </button>
          </div>

          {canManageVisibility && (
            <div className="mt-3 border-t border-border pt-3 space-y-2">
              <label className="text-xs font-bold text-muted-foreground">Visibility</label>
              <select
                value={form.visibility}
                onChange={(e) => setForm({ ...form, visibility: e.target.value as BatchVisibility, visibilityCentreIds: [] })}
                className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="global">Global / PAN India — available to all centres</option>
                <option value="centre_specific">Centre Specific — pick which centres</option>
                <option value="disabled">Disabled — not available to any centre</option>
              </select>
              {form.visibility === "centre_specific" && (
                <CentreMultiSelect
                  centres={centres}
                  selected={form.visibilityCentreIds}
                  onChange={(ids) => setForm({ ...form, visibilityCentreIds: ids })}
                />
              )}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="p-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : batches.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">No batches yet.</div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ course, items }) => (
            <div key={course.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="bg-muted/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground">
                {course.name} <span className="text-muted-foreground font-medium normal-case">· {items.length} batch{items.length === 1 ? "" : "es"}</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-muted/20">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Code</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Class</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Students</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((b) => (
                    <tr key={b.id} className={`border-t border-border ${b.visibility === "disabled" ? "opacity-50" : ""}`}>
                      <td className="px-4 py-2 font-mono text-xs">{b.code}</td>
                      <td className="px-4 py-2">
                        {b.name}
                        <VisibilityPill visibility={b.visibility} centreCount={batchCentreMap.get(b.id)?.length ?? 0} />
                      </td>
                      <td className="px-4 py-2">{b.class_level ?? "—"}</td>
                      <td className="px-4 py-2">
                        {b.is_active
                          ? <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Active</span>
                          : <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">Inactive</span>}
                      </td>
                      <td className="px-4 py-2"><span className="inline-flex items-center gap-1 text-xs"><Users className="h-3 w-3" /> {studentCounts[b.id] ?? 0}</span></td>
                      <td className="px-4 py-2 text-right">
                        {canManageBatches && (
                          <div className="inline-flex items-center gap-1">
                            <button onClick={() => openEdit(b)} title="Edit batch" className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => deleteBatch(b.id)} title="Delete batch" className="rounded p-1.5 text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

      {/* Auto-created franchise batches carry no course_id, so for most centres
          every batch they own lands here. Hiding this section made the Batches
          tab look completely empty for them. Batch codes like XI-J repeat
          identically across every franchise centre, so instead of listing all
          centres at once (a wall of near-identical cards), the admin picks one
          centre from a dropdown and only that centre's batches render. */}
          {orphans.length > 0 && activeOrphanGroup && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Batches not linked to a course <span className="normal-case font-medium">· {orphanGroups.length} centre{orphanGroups.length === 1 ? "" : "s"}, {orphans.length} batch{orphans.length === 1 ? "" : "es"}</span>
                </p>
                {orphanGroups.length > 1 && (
                  <select
                    value={activeOrphanGroup.key}
                    onChange={(e) => setOrphanCentreKey(e.target.value)}
                    className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold"
                  >
                    {orphanGroups.map((g) => (
                      <option key={g.key} value={g.key}>{g.label} ({g.items.length})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="bg-muted/40 px-4 py-2 text-xs font-bold uppercase tracking-wider text-foreground">
                  {activeOrphanGroup.label} <span className="text-muted-foreground font-medium normal-case">· {activeOrphanGroup.items.length} batch{activeOrphanGroup.items.length === 1 ? "" : "es"}</span>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    {activeOrphanGroup.items.map((b) => (
                      <tr key={b.id} className={`border-t border-border ${b.visibility === "disabled" ? "opacity-50" : ""}`}>
                        <td className="px-4 py-2 font-mono text-xs">{b.code}</td>
                        <td className="px-4 py-2">
                          {b.name}
                          <VisibilityPill visibility={b.visibility} centreCount={batchCentreMap.get(b.id)?.length ?? 0} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          {canManageBatches && (
                            <>
                              <button onClick={() => openEdit(b)} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => deleteBatch(b.id)} className="rounded p-1.5 text-destructive hover:bg-destructive/10 ml-1">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" />
                <h2 className="font-bold">Edit Batch</h2>
              </div>
              <button onClick={() => !savingEdit && setEditing(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Course *</label>
                <select
                  value={editing.course_id}
                  onChange={(e) => setEditing({ ...editing, course_id: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select course…</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground">Code *</label>
                  <input
                    value={editing.code}
                    onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground">Class</label>
                  <select
                    value={editing.class_level ?? ""}
                    onChange={(e) => setEditing({ ...editing, class_level: e.target.value || null })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Display name</label>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                />
                Active
              </label>

              {canManageVisibility && (
                <div className="space-y-2 border-t border-border pt-3">
                  <label className="text-xs font-bold text-muted-foreground">Visibility</label>
                  <select
                    value={editing.visibility}
                    onChange={(e) => setEditing({ ...editing, visibility: e.target.value as BatchVisibility })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="global">Global / PAN India — available to all centres</option>
                    <option value="centre_specific">Centre Specific — pick which centres</option>
                    <option value="disabled">Disabled — not available to any centre</option>
                  </select>
                  {editing.visibility === "centre_specific" && (
                    <CentreMultiSelect
                      centres={centres}
                      selected={editing.visibilityCentreIds}
                      onChange={(ids) => setEditing({ ...editing, visibilityCentreIds: ids })}
                    />
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-border p-5">
              <button onClick={() => setEditing(null)} disabled={savingEdit}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={savingEdit}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-60">
                {savingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBatchesPage;
