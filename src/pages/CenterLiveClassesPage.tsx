import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Loader2, Video, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

type LiveClass = {
  id: string;
  centre_id: string | null;
  title: string;
  slug: string;
  subject: string;
  educator_name: string;
  target_exam: string | null;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  meeting_url: string | null;
  status: string;
};

const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology", "Mixed"];
const EXAMS = ["JEE Main", "JEE Advanced", "IIT JEE", "NEET", "Foundation", "Boards"];
const STATUSES = ["scheduled", "live", "completed", "cancelled"];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const blank = (centreId: string, userId: string) => ({
  centre_id: centreId,
  created_by: userId,
  title: "",
  subject: "Physics",
  educator_name: "",
  target_exam: "JEE Main",
  description: "",
  starts_at: "",
  ends_at: "",
  meeting_url: "",
  status: "scheduled",
});

const CenterLiveClassesPage = () => {
  const { primaryCenterId } = useCenterAdmin();
  const { user } = useAuth();
  const [items, setItems] = useState<LiveClass[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!primaryCenterId) return;
    const { data, error } = await supabase
      .from("live_classes")
      .select("id, centre_id, title, slug, subject, educator_name, target_exam, description, starts_at, ends_at, meeting_url, status")
      .eq("centre_id", primaryCenterId)
      .order("starts_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as any);
  };

  useEffect(() => { load(); }, [primaryCenterId]);

  if (!primaryCenterId || !user) {
    return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;
  }

  const handleSave = async () => {
    if (!editing?.title) return toast.error("Title is required");
    if (!editing?.starts_at) return toast.error("Start time is required");
    if (!editing?.educator_name) return toast.error("Educator name is required");
    setSaving(true);
    const payload: any = {
      ...editing,
      centre_id: primaryCenterId,
      starts_at: new Date(editing.starts_at).toISOString(),
      ends_at: editing.ends_at ? new Date(editing.ends_at).toISOString() : null,
      target_exam: editing.target_exam || null,
      meeting_url: editing.meeting_url || null,
      description: editing.description || null,
    };
    if (!payload.id) {
      payload.created_by = user.id;
      payload.slug = `${slugify(payload.title)}-${Math.random().toString(36).slice(2, 6)}`;
    }
    const { error } = payload.id
      ? await supabase.from("live_classes").update(payload).eq("id", payload.id)
      : await supabase.from("live_classes").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this live class?")) return;
    const { error } = await supabase.from("live_classes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black font-display text-foreground">Live Classes</h1>
          <p className="text-sm text-muted-foreground">Schedule live classes for students mapped to your centre.</p>
        </div>
        <button onClick={() => setEditing(blank(primaryCenterId, user.id))} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> New Live Class
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Video className="h-4 w-4" />
              </div>
              <p className="text-sm font-bold text-foreground flex-1">{c.title}</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.status === "live" ? "bg-red-500/10 text-red-600" : c.status === "completed" ? "bg-muted text-muted-foreground" : "bg-secondary/10 text-secondary"}`}>
                {c.status}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{c.subject} · {c.target_exam ?? "—"}</p>
            <p className="text-xs text-foreground">Educator: {c.educator_name}</p>
            <p className="text-xs text-muted-foreground">{new Date(c.starts_at).toLocaleString()}</p>
            {c.meeting_url && (
              <a href={c.meeting_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Meeting link <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEditing({ ...c, starts_at: toLocalInput(c.starts_at), ends_at: toLocalInput(c.ends_at) })} className="rounded-md border border-border px-3 py-1 text-xs">Edit</button>
              <button onClick={() => handleDelete(c.id)} className="rounded-md border border-destructive/40 text-destructive px-2 py-1 text-xs">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
        {!items.length && <p className="text-sm text-muted-foreground">No live classes yet. Click "New Live Class" to schedule one.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto" onClick={() => setEditing(null)}>
          <div className="w-full max-w-2xl my-8 rounded-xl bg-card p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground">{editing.id ? "Edit Live Class" : "New Live Class"}</h2>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Title</label>
              <input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. JEE Physics — Rotational Motion" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Subject</label>
                <select value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {SUBJECTS.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Target Exam</label>
                <select value={editing.target_exam ?? ""} onChange={(e) => setEditing({ ...editing, target_exam: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {EXAMS.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Educator Name</label>
              <input value={editing.educator_name ?? ""} onChange={(e) => setEditing({ ...editing, educator_name: e.target.value })} placeholder="e.g. Mr. Sharma" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Starts at</label>
                <input type="datetime-local" value={editing.starts_at ?? ""} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Ends at (optional)</label>
                <input type="datetime-local" value={editing.ends_at ?? ""} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Meeting URL</label>
              <input value={editing.meeting_url ?? ""} onChange={(e) => setEditing({ ...editing, meeting_url: e.target.value })} placeholder="https://meet.google.com/..." className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Status</label>
              <select value={editing.status ?? "scheduled"} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                {STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Description (optional)</label>
              <textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </div>

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

export default CenterLiveClassesPage;
