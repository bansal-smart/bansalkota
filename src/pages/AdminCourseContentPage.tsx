import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  FileText, Upload, Loader2, Trash2, Eye, EyeOff, Search, BookOpen, ArrowLeft, Download, X,
  Plus, Video, Youtube, Pencil, FolderPlus

} from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

type Course = { id: string; name: string; slug: string; subject: string; educator_name: string; thumbnail_url: string | null };
type Chapter = { id: string; title: string; position: number };
type Resource = {
  id: string;
  course_id: string;
  chapter_id: string | null;
  title: string;
  description: string | null;
  resource_type: string;
  file_url: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  is_published: boolean;
  position: number;
  created_at: string;
};

const RESOURCE_TYPES = [
  { value: "pdf", label: "PDF" },
  { value: "notes", label: "Notes" },
  { value: "worksheet", label: "Worksheet" },
  { value: "solution", label: "Solution" },
  { value: "other", label: "Other" },
];

const typeStyle: Record<string, string> = {
  pdf: "bg-destructive/15 text-destructive border-destructive/30",
  notes: "bg-primary/15 text-primary border-primary/30",
  worksheet: "bg-secondary/15 text-secondary border-secondary/30",
  solution: "bg-accent/15 text-accent-foreground border-accent/30",
  other: "bg-muted text-muted-foreground border-border",
};

const uploadSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(150),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  resource_type: z.enum(["pdf", "notes", "worksheet", "solution", "other"]),
  chapter_id: z.string().optional(),
});

const MAX_FILE_BYTES = 25 * 1024 * 1024;

const formatSize = (b: number | null) => {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

const AdminCourseContentPage = () => {
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resLoading, setResLoading] = useState(false);
  const [chapterFilter, setChapterFilter] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    resource_type: "pdf" as "pdf" | "notes" | "worksheet" | "solution" | "other",
    chapter_id: "none",
    is_published: true,
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Load courses
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id,name,slug,subject,educator_name,thumbnail_url")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      setCourses((data as Course[]) ?? []);
      setCoursesLoading(false);
    })();
  }, []);

  // Load chapters + resources when a course is selected
  const loadCourseDetail = async (courseId: string) => {
    setResLoading(true);
    const [{ data: ch }, { data: rs }] = await Promise.all([
      supabase.from("chapters").select("id,title,position").eq("course_id", courseId).order("position"),
      supabase.from("course_resources").select("*").eq("course_id", courseId).order("created_at", { ascending: false }),
    ]);
    setChapters((ch as Chapter[]) ?? []);
    setResources((rs as Resource[]) ?? []);
    setResLoading(false);
  };

  useEffect(() => {
    if (selectedCourse) loadCourseDetail(selectedCourse.id);
    else { setChapters([]); setResources([]); setChapterFilter("all"); }
  }, [selectedCourse]);

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.subject.toLowerCase().includes(q) ||
      c.educator_name.toLowerCase().includes(q)
    );
  }, [courses, search]);

  const visibleResources = useMemo(() => {
    if (chapterFilter === "all") return resources;
    if (chapterFilter === "none") return resources.filter((r) => !r.chapter_id);
    return resources.filter((r) => r.chapter_id === chapterFilter);
  }, [resources, chapterFilter]);

  const handleUpload = async () => {
    if (!selectedCourse) return;
    const parsed = uploadSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (!file) {
      toast.error("Please choose a file");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("File must be under 25 MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${selectedCourse.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("course-resources")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("course-resources").getPublicUrl(path);

      const { error: insErr } = await supabase.from("course_resources").insert({
        course_id: selectedCourse.id,
        chapter_id: form.chapter_id === "none" ? null : form.chapter_id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        resource_type: form.resource_type,
        file_url: pub.publicUrl,
        file_size_bytes: file.size,
        mime_type: file.type || null,
        is_published: form.is_published,
        uploaded_by: user?.id ?? null,
      });
      if (insErr) throw insErr;

      toast.success("Resource uploaded");
      setDialogOpen(false);
      setForm({ title: "", description: "", resource_type: "pdf", chapter_id: "none", is_published: true });
      setFile(null);
      loadCourseDetail(selectedCourse.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const togglePublish = async (r: Resource) => {
    if (r.is_published) {
      const ok = await confirm({
        title: `Unpublish "${r.title}"?`,
        description: "Students will lose access to this resource until it's republished.",
        confirmLabel: "Unpublish resource",
      });
      if (!ok) return;
    }
    const { error } = await supabase
      .from("course_resources")
      .update({ is_published: !r.is_published })
      .eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    setResources((prev) => prev.map((x) => x.id === r.id ? { ...x, is_published: !r.is_published } : x));
  };

  const deleteResource = async (r: Resource) => {
    const ok = await confirm({
      title: `Delete "${r.title}"?`,
      description: "This resource will be removed from the course and students will no longer be able to access it. This action cannot be undone.",
      confirmLabel: "Delete resource",
    });
    if (!ok) return;
    const { error } = await supabase.from("course_resources").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    setResources((prev) => prev.filter((x) => x.id !== r.id));
    toast.success("Resource deleted");
  };

  // ------------- View: Course list -------------
  if (!selectedCourse) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        {ConfirmDialog}
        <div>
          <h1 className="text-2xl font-black font-display text-foreground">Course Content</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a course to upload PDFs, notes, worksheets and other learning material.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by course, subject or educator"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {coursesLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 font-semibold text-foreground">No courses found</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filteredCourses.map((c) => (
                <li
                  key={c.id}
                  className="flex cursor-pointer items-center gap-4 p-4 hover:bg-muted/40 transition-colors"
                  onClick={() => setSelectedCourse(c)}
                >
                  <div className="h-12 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt={c.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.subject} · {c.educator_name}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">Manage content</Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ------------- View: Selected course -------------
  return (
    <div className="p-4 lg:p-6 space-y-6">
      {ConfirmDialog}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="sm" onClick={() => setSelectedCourse(null)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-black font-display text-foreground truncate">{selectedCourse.name}</h1>
            <p className="text-xs text-muted-foreground truncate">
              {selectedCourse.subject} · {selectedCourse.educator_name}
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Upload className="h-4 w-4" /> Upload resource
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-base font-bold text-foreground">
            Resources <span className="text-muted-foreground font-normal">({resources.length})</span>
          </h2>
          <Select value={chapterFilter} onValueChange={setChapterFilter}>
            <SelectTrigger className="w-full md:w-[240px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All chapters</SelectItem>
              <SelectItem value="none">No chapter</SelectItem>
              {chapters.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {resLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : visibleResources.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 font-semibold text-foreground">No resources yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Upload your first PDF or notes for this course.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visibleResources.map((r) => {
              const chapter = chapters.find((c) => c.id === r.chapter_id);
              return (
                <li key={r.id} className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground truncate">{r.title}</p>
                      <Badge variant="outline" className={`text-[10px] uppercase ${typeStyle[r.resource_type]}`}>
                        {r.resource_type}
                      </Badge>
                      {!r.is_published && <Badge variant="outline" className="text-[10px]">Draft</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {chapter ? `${chapter.title} · ` : ""}{formatSize(r.file_size_bytes)} · {format(new Date(r.created_at), "dd MMM")}
                    </p>
                    {r.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{r.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={r.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => togglePublish(r)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"
                      title={r.is_published ? "Unpublish" : "Publish"}
                    >
                      {r.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => deleteResource(r)}
                      className="rounded-lg p-2 text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Chapter 3 — Notes (Kinematics)"
              />
            </div>
            <div>
              <Label htmlFor="desc">Description (optional)</Label>
              <Textarea
                id="desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.resource_type}
                  onValueChange={(v) => setForm({ ...form, resource_type: v as typeof form.resource_type })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RESOURCE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Chapter (optional)</Label>
                <Select
                  value={form.chapter_id}
                  onValueChange={(v) => setForm({ ...form, chapter_id: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No chapter</SelectItem>
                    {chapters.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="file">File (PDF, DOC, image — max 25 MB)</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {file.name} · {formatSize(file.size)}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium text-foreground">Publish immediately</p>
                <p className="text-xs text-muted-foreground">Visible to students of this course</p>
              </div>
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm({ ...form, is_published: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCourseContentPage;
