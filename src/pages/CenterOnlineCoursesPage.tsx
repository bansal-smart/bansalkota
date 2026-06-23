import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Save, Loader2, Upload, BookOpen, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type OnlineCourse = {
  id: string;
  centre_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  short_description: string | null;
  full_description: string | null;
  educator_name: string | null;
  learning_outcomes: string[] | null;
  requirements: string[] | null;
  price: number | null;
  original_price: number | null;
  thumbnail_url: string | null;
  subject: string | null;
  target_exam: string | null;
  class_level: string | null;
  is_published: boolean;
  sort_order: number;
};

const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology", "Mixed"];
const EXAMS = ["JEE Main", "JEE Advanced", "IIT JEE", "NEET", "Foundation", "Boards"];
const CLASSES = ["Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "Dropper"];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

const blank = (centreId: string, userId: string) => ({
  centre_id: centreId,
  created_by: userId,
  title: "",
  short_description: "",
  full_description: "",
  description: "",
  thumbnail_url: "",
  subject: "Physics",
  target_exam: "JEE Main",
  class_level: "Class 11",
  educator_name: "",
  learning_outcomes: [] as string[],
  requirements: [] as string[],
  price: null as number | null,
  original_price: null as number | null,
  is_published: true,
  sort_order: 0,
});

const CenterOnlineCoursesPage = () => {
  const { primaryCenterId } = useCenterAdmin();
  const { user } = useAuth();
  const [items, setItems] = useState<OnlineCourse[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [outcomeDraft, setOutcomeDraft] = useState("");
  const [requirementDraft, setRequirementDraft] = useState("");

  const openEditor = (data: any) => {
    setEditing({
      ...data,
      learning_outcomes: Array.isArray(data.learning_outcomes) ? data.learning_outcomes : [],
      requirements: Array.isArray(data.requirements) ? data.requirements : [],
    });
    setOutcomeDraft("");
    setRequirementDraft("");
  };


  const load = async () => {
    if (!primaryCenterId) return;
    const { data } = await supabase
      .from("centre_online_courses" as any)
      .select("*")
      .eq("centre_id", primaryCenterId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setItems((data ?? []) as any);
  };

  useEffect(() => { load(); }, [primaryCenterId]);

  if (!primaryCenterId || !user) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  const handleUpload = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `centers/${primaryCenterId}/online-courses/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed: " + error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    setEditing((e: any) => ({ ...(e ?? {}), thumbnail_url: data.publicUrl }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!editing?.title) return toast.error("Title is required");
    setSaving(true);
    const payload: any = { ...editing, centre_id: primaryCenterId };
    if (!payload.id) payload.created_by = user.id;
    if (!payload.slug) payload.slug = `${slugify(payload.title)}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = payload.id
      ? await (supabase as any).from("centre_online_courses" as any).update(payload).eq("id", payload.id)
      : await (supabase as any).from("centre_online_courses" as any).insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course and all its chapters/lectures?")) return;
    await (supabase as any).from("centre_online_courses" as any).delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black font-display text-foreground">Online Courses</h1>
          <p className="text-sm text-muted-foreground">Create centre-specific online video courses. Add chapters and YouTube lectures inside each course.</p>
        </div>
        <button onClick={() => setEditing(blank(primaryCenterId, user.id))} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> New Online Course
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card overflow-hidden">
            {c.thumbnail_url ? <img src={c.thumbnail_url} alt={c.title} className="h-36 w-full object-cover" /> : (
              <div className="h-36 bg-muted flex items-center justify-center"><BookOpen className="h-8 w-8 text-muted-foreground" /></div>
            )}
            <div className="p-4 space-y-2">
              <p className="text-sm font-bold text-foreground">{c.title}</p>
              <p className="text-xs text-muted-foreground">{[c.subject, c.target_exam, c.class_level].filter(Boolean).join(" · ")}</p>
              {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
              <div className="flex items-center gap-2 pt-1">
                <Link to={`/center/online-courses/${c.id}`} className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-3 py-1 text-xs font-bold hover:bg-primary/20">
                  Manage Content <ArrowRight className="h-3 w-3" />
                </Link>
                <button onClick={() => setEditing(c)} className="rounded-md border border-border px-3 py-1 text-xs">Edit</button>
                <button onClick={() => handleDelete(c.id)} className="rounded-md border border-destructive/40 text-destructive px-2 py-1 text-xs">
                  <Trash2 className="h-3 w-3" />
                </button>
                <span className={`ml-auto rounded-full px-2 py-1 text-[10px] font-bold ${c.is_published ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"}`}>
                  {c.is_published ? "Published" : "Draft"}
                </span>
              </div>
            </div>
          </div>
        ))}
        {!items.length && <p className="text-sm text-muted-foreground">No online courses yet. Click "New Online Course" to create one.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-card p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground">{editing.id ? "Edit" : "New"} Online Course</h2>
            <div>
              <label className="text-xs font-medium text-foreground">Thumbnail</label>
              {editing.thumbnail_url && <img src={editing.thumbnail_url} alt="" className="h-28 w-full object-cover rounded-md mt-1" />}
              <label className="mt-2 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs cursor-pointer">
                <Upload className="h-3 w-3" /> {uploading ? "Uploading…" : "Upload thumbnail"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              </label>
            </div>
            <input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Course title" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Description" rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <div className="grid grid-cols-3 gap-2">
              <select value={editing.subject ?? ""} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option>Physics</option><option>Chemistry</option><option>Mathematics</option><option>Biology</option><option>Mixed</option>
              </select>
              <select value={editing.target_exam ?? ""} onChange={(e) => setEditing({ ...editing, target_exam: e.target.value })} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option>IIT JEE</option><option>NEET</option><option>Foundation</option><option>Boards</option>
              </select>
              <select value={editing.class_level ?? ""} onChange={(e) => setEditing({ ...editing, class_level: e.target.value })} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option>Class 8</option><option>Class 9</option><option>Class 10</option><option>Class 11</option><option>Class 12</option><option>Dropper</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={editing.is_published ?? true} onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })} />
              Published
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
    </div>
  );
};

export default CenterOnlineCoursesPage;
