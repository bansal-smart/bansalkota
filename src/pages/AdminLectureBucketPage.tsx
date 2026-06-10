import { useCallback, useEffect, useMemo, useState } from "react";
import { Youtube, Plus, Search, Pencil, Trash2, Save, X, ExternalLink, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

type Lecture = {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  topic: string | null;
  youtube_url: string;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  tags: string[];
  created_at: string;
};

const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology", "Other"];

const emptyForm = (): Partial<Lecture> => ({
  title: "",
  description: "",
  subject: "Physics",
  topic: "",
  youtube_url: "",
  duration_seconds: 0,
  thumbnail_url: "",
  tags: [],
});

const extractYouTubeId = (url: string) => {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m?.[1] ?? null;
};

const AdminLectureBucketPage = () => {
  const { user } = useAuth();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Lecture> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("lecture_bucket")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setLectures((data ?? []) as Lecture[]);

    // Usage counts (lessons referencing this bucket entry)
    const { data: usageRows } = await (supabase as any)
      .from("lessons")
      .select("lecture_id")
      .not("lecture_id", "is", null);
    const map: Record<string, number> = {};
    (usageRows ?? []).forEach((r: any) => {
      if (r.lecture_id) map[r.lecture_id] = (map[r.lecture_id] ?? 0) + 1;
    });
    setUsage(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return lectures.filter((l) => {
      if (subjectFilter !== "all" && l.subject !== subjectFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !l.title.toLowerCase().includes(q) &&
          !(l.topic ?? "").toLowerCase().includes(q) &&
          !(l.tags ?? []).join(" ").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [lectures, search, subjectFilter]);

  const openCreate = () => {
    setEditing(emptyForm());
    setOpen(true);
  };

  const openEdit = (l: Lecture) => {
    setEditing({ ...l });
    setOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.title?.trim() || !editing.youtube_url?.trim() || !editing.subject) {
      toast.error("Title, subject and YouTube URL are required");
      return;
    }
    if (!extractYouTubeId(editing.youtube_url)) {
      toast.error("Please paste a valid YouTube URL");
      return;
    }
    setSaving(true);
    const ytId = extractYouTubeId(editing.youtube_url);
    const payload: any = {
      title: editing.title.trim(),
      description: editing.description?.trim() || null,
      subject: editing.subject,
      topic: editing.topic?.trim() || null,
      youtube_url: editing.youtube_url.trim(),
      duration_seconds: Number(editing.duration_seconds) || 0,
      thumbnail_url:
        editing.thumbnail_url?.trim() ||
        (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null),
      tags: editing.tags ?? [],
    };
    let res;
    if (editing.id) {
      res = await (supabase as any).from("lecture_bucket").update(payload).eq("id", editing.id);
    } else {
      res = await (supabase as any)
        .from("lecture_bucket")
        .insert({ ...payload, created_by: user?.id ?? null });
    }
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(editing.id ? "Lecture updated" : "Lecture added to bucket");
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (l: Lecture) => {
    if (usage[l.id] && usage[l.id] > 0) {
      if (!confirm(`This lecture is used in ${usage[l.id]} lesson(s). Delete anyway? Lessons will keep their stored URL.`))
        return;
    } else if (!confirm("Delete this lecture from the bucket?")) {
      return;
    }
    const { error } = await (supabase as any).from("lecture_bucket").delete().eq("id", l.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    load();
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2">
            <Youtube className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Lecture Bucket</h1>
            <p className="text-xs text-muted-foreground">
              Reusable library of YouTube lectures. Pick lectures into any course by searching the title.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Lecture
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, topic, or tag…"
            className="pl-8 h-9"
          />
        </div>
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {SUBJECTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No lectures yet. Click <strong>Add Lecture</strong> to start your bucket.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Lecture</th>
                  <th className="text-left p-3">Subject</th>
                  <th className="text-left p-3">Topic</th>
                  <th className="text-left p-3">Used in</th>
                  <th className="text-left p-3">Link</th>
                  <th className="text-right p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {l.thumbnail_url ? (
                          <img src={l.thumbnail_url} alt="" className="h-10 w-16 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-16 rounded bg-muted" />
                        )}
                        <div>
                          <div className="font-semibold text-foreground">{l.title}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            ID: {l.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary">{l.subject}</Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{l.topic || "—"}</td>
                    <td className="p-3">
                      <Badge variant={usage[l.id] ? "default" : "outline"}>
                        {usage[l.id] ?? 0} course{(usage[l.id] ?? 0) === 1 ? "" : "s"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <a
                        href={l.youtube_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                      >
                        <ExternalLink className="h-3 w-3" /> Open
                      </a>
                    </td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(l)} className="gap-1">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(l)} className="gap-1 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit lecture" : "Add lecture to bucket"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Title *</label>
                <Input
                  value={editing.title ?? ""}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="e.g. Newton's Laws — full chapter"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Subject *</label>
                  <Select
                    value={editing.subject ?? "Physics"}
                    onValueChange={(v) => setEditing({ ...editing, subject: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Topic</label>
                  <Input
                    value={editing.topic ?? ""}
                    onChange={(e) => setEditing({ ...editing, topic: e.target.value })}
                    placeholder="e.g. Kinematics"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">YouTube URL *</label>
                <Input
                  value={editing.youtube_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, youtube_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Duration (seconds)</label>
                  <Input
                    type="number"
                    value={editing.duration_seconds ?? 0}
                    onChange={(e) => setEditing({ ...editing, duration_seconds: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Thumbnail URL (optional)</label>
                  <Input
                    value={editing.thumbnail_url ?? ""}
                    onChange={(e) => setEditing({ ...editing, thumbnail_url: e.target.value })}
                    placeholder="Auto-detected if blank"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Description</label>
                <Textarea
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Tags (comma separated)</label>
                <Input
                  value={(editing.tags ?? []).join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="JEE Main, Class 11, kinematics"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="gap-1">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLectureBucketPage;
