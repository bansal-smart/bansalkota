import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Loader2, Upload, BookOpen, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import BulkCsvDialog, { type CsvField } from "@/components/BulkCsvDialog";
import AspectRatioHint from "@/components/admin/AspectRatioHint";

type CenterCourse = {
  id: string;
  centre_id: string;
  title: string;
  slug: string | null;
  banner_url: string | null;
  start_date: string | null;
  duration: string | null;
  fees: number | null;
  currency: string;
  schedule: string | null;
  target_exam: string | null;
  class_level: string | null;
  description: string | null;
  highlights: any;
  brochure_url: string | null;
  is_published: boolean;
  sort_order: number;
};

const blank = (centerId: string, userId: string): Partial<CenterCourse & { created_by: string }> => ({
  centre_id: centerId,
  created_by: userId,
  title: "",
  banner_url: "",
  start_date: "",
  duration: "",
  fees: null,
  currency: "INR",
  schedule: "",
  target_exam: "IIT JEE",
  class_level: "Class 11",
  description: "",
  highlights: [],
  brochure_url: "",
  is_published: true,
  sort_order: 0,
});

const CenterCoursesPage = () => {
  const { primaryCenterId } = useCenterAdmin();
  const { user } = useAuth();
  const [items, setItems] = useState<CenterCourse[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const load = async () => {
    if (!primaryCenterId) return;
    const { data } = await supabase
      .from("centre_courses" as any)
      .select("*")
      .eq("centre_id", primaryCenterId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setItems((data ?? []) as any);
  };

  useEffect(() => {
    load();
  }, [primaryCenterId]);

  if (!primaryCenterId || !user) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `centers/${primaryCenterId}/courses/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    setEditing((e: any) => ({ ...(e ?? {}), banner_url: data.publicUrl }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!editing?.title) return toast.error("Title is required");
    setSaving(true);
    const payload: any = { ...editing, centre_id: primaryCenterId };
    if (!payload.id) payload.created_by = user.id;
    if (payload.fees === "") payload.fees = null;
    if (payload.start_date === "") payload.start_date = null;
    const { error } = payload.id
      ? await (supabase as any).from("centre_courses" as any).update(payload).eq("id", payload.id)
      : await (supabase as any).from("centre_courses" as any).insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    await (supabase as any).from("centre_courses" as any).delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black font-display text-foreground">Offline Courses</h1>
          <p className="text-sm text-muted-foreground">Courses you offer at this centre — shown on your public page with a "Enquire" form.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setBulkOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold hover:bg-muted"
          >
            <FileSpreadsheet className="h-4 w-4" /> Bulk import / export
          </button>
          <button onClick={() => setEditing(blank(primaryCenterId, user.id))} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> New Course
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card overflow-hidden">
            {c.banner_url ? <img src={c.banner_url} alt={c.title} className="h-36 w-full object-cover" /> : (
              <div className="h-36 bg-muted flex items-center justify-center"><BookOpen className="h-8 w-8 text-muted-foreground" /></div>
            )}
            <div className="p-4 space-y-2">
              <p className="text-sm font-bold text-foreground">{c.title}</p>
              <p className="text-xs text-muted-foreground">{c.target_exam} · {c.class_level}</p>
              <p className="text-xs text-muted-foreground">Starts: {c.start_date || "TBD"} · {c.duration || "—"}</p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(c)} className="rounded-md border border-border px-3 py-1 text-xs">Edit</button>
                <button onClick={() => handleDelete(c.id)} className="rounded-md border border-destructive/40 text-destructive px-3 py-1 text-xs inline-flex items-center gap-1">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
                <span className={`ml-auto rounded-full px-2 py-1 text-[10px] font-bold ${c.is_published ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>
                  {c.is_published ? "Published" : "Draft"}
                </span>
              </div>
            </div>
          </div>
        ))}
        {!items.length && <p className="text-sm text-muted-foreground">No offline courses yet.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-card p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground">{editing.id ? "Edit" : "New"} Offline Course</h2>
            <div>
              <label className="text-xs font-medium text-foreground">Banner</label>
              <AspectRatioHint ratio="16:9" size="1600×900" note="course banner shown on card" />
              {editing.banner_url && <img src={editing.banner_url} alt="" className="h-28 w-full object-cover rounded-md mt-1" />}
              <label className="mt-2 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs cursor-pointer">
                <Upload className="h-3 w-3" /> {uploading ? "Uploading…" : "Upload banner"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              </label>
            </div>
            <input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Course title" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={editing.target_exam ?? ""} onChange={(e) => setEditing({ ...editing, target_exam: e.target.value })} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option>IIT JEE</option><option>NEET</option><option>Foundation</option><option>Boards</option>
              </select>
              <select value={editing.class_level ?? ""} onChange={(e) => setEditing({ ...editing, class_level: e.target.value })} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option>Class 8</option><option>Class 9</option><option>Class 10</option><option>Class 11</option><option>Class 12</option><option>Dropper</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={editing.start_date ?? ""} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <input value={editing.duration ?? ""} onChange={(e) => setEditing({ ...editing, duration: e.target.value })} placeholder="Duration (e.g. 2 years)" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>
            <input value={editing.schedule ?? ""} onChange={(e) => setEditing({ ...editing, schedule: e.target.value })} placeholder="Schedule (e.g. Mon–Sat, 7 AM)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Description" rows={4} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <input value={editing.brochure_url ?? ""} onChange={(e) => setEditing({ ...editing, brochure_url: e.target.value })} placeholder="Brochure URL (optional)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={editing.is_published ?? true} onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })} />
              Published (visible on centre page)
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="rounded-md border border-border px-3 py-2 text-xs">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground inline-flex items-center gap-1">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      <BulkCsvDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bulk import / export Offline Courses"
        description="Export your current courses, or upload a CSV to upsert by title. Existing titles are updated; new ones are created."
        fileBase="centre-courses"
        exportRows={items as any}
        fields={[
          { key: "title", label: "Title", required: true, example: "JEE Adv 2-Year Classroom" },
          { key: "target_exam", label: "Target Exam", example: "IIT JEE" },
          { key: "class_level", label: "Class", example: "Class 11" },
          { key: "start_date", label: "Start Date", example: "2026-04-01" },
          { key: "duration", label: "Duration", example: "2 years" },
          { key: "schedule", label: "Schedule", example: "Mon–Sat 7–11 AM" },
          { key: "description", label: "Description", example: "Comprehensive JEE Advanced program" },
          { key: "brochure_url", label: "Brochure URL", example: "" },
          {
            key: "is_published",
            label: "Published",
            parse: (v) => /^(true|yes|y|1)$/i.test(v),
            example: "true",
          },
        ] satisfies CsvField[]}
        bulkImport={async (rows, dry_run) => {
          const { data, error } = await (supabase as any).functions.invoke("bulk-import", {
            body: { kind: "centre_courses", rows, dry_run, centre_id: primaryCenterId },
          });
          if (error) throw new Error(error.message || "Bulk import failed");
          return data;
        }}
        onDone={load}
      />
    </div>
  );
};

export default CenterCoursesPage;
