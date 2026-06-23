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

  const handleSave = async (publish?: boolean) => {
    if (!editing?.title) return toast.error("Course Title is required");
    setSaving(true);
    const payload: any = {
      ...editing,
      centre_id: primaryCenterId,
      learning_outcomes: editing.learning_outcomes ?? [],
      requirements: editing.requirements ?? [],
    };
    delete payload.price;
    delete payload.original_price;
    if (typeof publish === "boolean") payload.is_published = publish;
    if (!payload.id) payload.created_by = user.id;
    if (!payload.slug) payload.slug = `${slugify(payload.title)}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = payload.id
      ? await (supabase as any).from("centre_online_courses" as any).update(payload).eq("id", payload.id)
      : await (supabase as any).from("centre_online_courses" as any).insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(publish === false ? "Saved as draft" : "Saved");
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
        <button onClick={() => openEditor(blank(primaryCenterId, user.id))} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
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
                <button onClick={() => openEditor(c)} className="rounded-md border border-border px-3 py-1 text-xs">Edit</button>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto" onClick={() => setEditing(null)}>
          <div className="w-full max-w-3xl my-8 rounded-xl bg-card p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-black font-display text-foreground">{editing.id ? "Edit Course" : "Create New Course"}</h2>

            {/* Basic Information */}
            <section className="rounded-lg border border-border p-5 space-y-4">
              <h3 className="text-base font-bold text-foreground">Basic Information</h3>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Course Title</label>
                <input
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="e.g. JEE Physics Booster 2027"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Short Description</label>
                <input
                  value={editing.short_description ?? ""}
                  onChange={(e) => setEditing({ ...editing, short_description: e.target.value.slice(0, 150) })}
                  placeholder="150 chars max"
                  maxLength={150}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Full Description</label>
                <textarea
                  value={editing.full_description ?? ""}
                  onChange={(e) => setEditing({ ...editing, full_description: e.target.value })}
                  placeholder="Detailed course description..."
                  rows={4}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Exam</label>
                  <select
                    value={editing.target_exam ?? ""}
                    onChange={(e) => setEditing({ ...editing, target_exam: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {EXAMS.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Subject</label>
                  <select
                    value={editing.subject ?? ""}
                    onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {SUBJECTS.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Class</label>
                  <select
                    value={editing.class_level ?? ""}
                    onChange={(e) => setEditing({ ...editing, class_level: e.target.value })}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {CLASSES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Educator Name</label>
                  <input
                    value={editing.educator_name ?? ""}
                    onChange={(e) => setEditing({ ...editing, educator_name: e.target.value })}
                    placeholder="e.g. Vikram Thapar"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </section>

            {/* Thumbnail */}
            <section className="rounded-lg border border-border p-5 space-y-3">
              <h3 className="text-base font-bold text-foreground">Thumbnail</h3>
              {editing.thumbnail_url ? (
                <div className="space-y-2">
                  <img src={editing.thumbnail_url} alt="" className="h-40 w-full object-cover rounded-md" />
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, thumbnail_url: "" })}
                    className="text-xs text-destructive"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-40 w-full rounded-md border-2 border-dashed border-border cursor-pointer text-muted-foreground hover:bg-muted/50">
                  <Upload className="h-6 w-6 mb-1" />
                  <span className="text-xs">{uploading ? "Uploading…" : "Click to upload thumbnail"}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                </label>
              )}
            </section>

            {/* What You'll Learn */}
            <section className="rounded-lg border border-border p-5 space-y-3">
              <div>
                <h3 className="text-base font-bold text-foreground">What You'll Learn</h3>
                <p className="text-xs text-muted-foreground">Add learning outcomes students will gain from this course.</p>
              </div>
              {(editing.learning_outcomes ?? []).length > 0 && (
                <ul className="space-y-1">
                  {(editing.learning_outcomes as string[]).map((o, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 rounded-md bg-muted px-3 py-1.5">{o}</span>
                      <button
                        type="button"
                        onClick={() => setEditing({ ...editing, learning_outcomes: (editing.learning_outcomes as string[]).filter((_, idx) => idx !== i) })}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  value={outcomeDraft}
                  onChange={(e) => setOutcomeDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && outcomeDraft.trim()) {
                      e.preventDefault();
                      setEditing({ ...editing, learning_outcomes: [...(editing.learning_outcomes ?? []), outcomeDraft.trim()] });
                      setOutcomeDraft("");
                    }
                  }}
                  placeholder="e.g. Core fundamentals and theory"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!outcomeDraft.trim()) return;
                    setEditing({ ...editing, learning_outcomes: [...(editing.learning_outcomes ?? []), outcomeDraft.trim()] });
                    setOutcomeDraft("");
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-[#1e3a8a] px-4 py-2 text-xs font-bold text-white"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            </section>

            {/* Requirements */}
            <section className="rounded-lg border border-border p-5 space-y-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Requirements</h3>
                <p className="text-xs text-muted-foreground">Add prerequisites or things students should know before starting.</p>
              </div>
              {(editing.requirements ?? []).length > 0 && (
                <ul className="space-y-1">
                  {(editing.requirements as string[]).map((o, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 rounded-md bg-muted px-3 py-1.5">{o}</span>
                      <button
                        type="button"
                        onClick={() => setEditing({ ...editing, requirements: (editing.requirements as string[]).filter((_, idx) => idx !== i) })}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  value={requirementDraft}
                  onChange={(e) => setRequirementDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && requirementDraft.trim()) {
                      e.preventDefault();
                      setEditing({ ...editing, requirements: [...(editing.requirements ?? []), requirementDraft.trim()] });
                      setRequirementDraft("");
                    }
                  }}
                  placeholder="e.g. Basic algebra and calculus"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!requirementDraft.trim()) return;
                    setEditing({ ...editing, requirements: [...(editing.requirements ?? []), requirementDraft.trim()] });
                    setRequirementDraft("");
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-[#1e3a8a] px-4 py-2 text-xs font-bold text-white"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>
            </section>


            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="rounded-md border border-border px-4 py-3 text-sm font-bold text-foreground hover:bg-muted"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="rounded-md bg-primary px-4 py-3 text-sm font-bold text-primary-foreground inline-flex items-center justify-center gap-2 hover:opacity-90"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editing.id ? "Save Course" : "Publish Course"}
              </button>
            </div>
            <button onClick={() => setEditing(null)} className="w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

    </div>
  );
};

export default CenterOnlineCoursesPage;
