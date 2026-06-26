import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Pencil, ChevronRight, ChevronDown, GripVertical, Eye, Video, FileText, ExternalLink, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { fetchCourseContentTree, reorderSiblings } from "@/lib/api/course-content";
import { extractYouTubeId, getYouTubeThumbnail, fetchYouTubeTitle } from "@/lib/youtube";
import { useConfirm } from "@/components/ConfirmDialog";
import BulkCourseVideosDialog from "@/components/BulkCourseVideosDialog";
import type { CourseSubject, CourseTopic, CourseSubtopic, SubtopicVideo, SubtopicPdf } from "@/types/course-content";


type RenameTarget = { table: string; id: string; current: string; label: string };

type Node =
  | { kind: "subject"; id: string; data: CourseSubject }
  | { kind: "topic"; id: string; data: CourseTopic; subject: CourseSubject }
  | { kind: "subtopic"; id: string; data: CourseSubtopic; topic: CourseTopic; subject: CourseSubject };

const AdminCourseHierarchyPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<{ id: string; name: string; slug: string } | null>(null);
  const [subjects, setSubjects] = useState<CourseSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Node | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addingSubject, setAddingSubject] = useState(false);
  const [addingTopicFor, setAddingTopicFor] = useState<string | null>(null);
  const [addingSubtopicFor, setAddingSubtopicFor] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const { confirm, ConfirmDialog } = useConfirm();

  const load = async () => {
    if (!courseId) return;
    setLoading(true);
    const { data: c } = await supabase.from("courses").select("id,name,slug").eq("id", courseId).maybeSingle();
    setCourse(c as any);
    const tree = await fetchCourseContentTree(courseId, null);
    setSubjects(tree);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const k = `admin_tree_${courseId}`;
    try { setExpanded(new Set(JSON.parse(localStorage.getItem(k) ?? "[]"))); } catch {}
  }, [courseId]);

  useEffect(() => {
    if (courseId) localStorage.setItem(`admin_tree_${courseId}`, JSON.stringify(Array.from(expanded)));
  }, [expanded, courseId]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const createSubject = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || !courseId) { setAddingSubject(false); return; }
    const { error } = await supabase.from("course_subjects" as any).insert({ course_id: courseId, name: trimmed, position: subjects.length });
    setAddingSubject(false);
    if (error) return toast.error(error.message);
    toast.success("Subject added"); load();
  };
  const createTopic = async (subject: CourseSubject, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) { setAddingTopicFor(null); return; }
    const { error } = await supabase.from("course_topics" as any).insert({
      course_id: courseId, subject_id: subject.id, name: trimmed, position: (subject.topics ?? []).length,
    });
    setAddingTopicFor(null);
    if (error) return toast.error(error.message);
    toast.success("Topic added"); load();
  };
  const createSubtopic = async (topic: CourseTopic, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) { setAddingSubtopicFor(null); return; }
    const { error } = await supabase.from("course_subtopics" as any).insert({
      course_id: courseId, topic_id: topic.id, name: trimmed, position: (topic.subtopics ?? []).length,
    });
    setAddingSubtopicFor(null);
    if (error) return toast.error(error.message);
    toast.success("Subtopic added"); load();
  };

  const openRename = (table: string, id: string, current: string, label: string) => {
    setRenameTarget({ table, id, current, label });
    setRenameValue(current);
  };
  const submitRename = async () => {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (!name || name === renameTarget.current) { setRenameTarget(null); return; }
    const { error } = await supabase.from(renameTarget.table as any).update({ name }).eq("id", renameTarget.id);
    setRenameTarget(null);
    if (error) return toast.error(error.message);
    toast.success("Renamed"); load();
  };

  const remove = async (table: string, id: string, label: string) => {
    const ok = await confirm({ title: `Delete ${label}?`, description: "This will permanently remove it and its contents.", confirmLabel: "Delete" });
    if (!ok) return;
    const { error } = await supabase.from(table as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (selected?.id === id) setSelected(null);
    toast.success("Deleted"); load();
  };

  const move = async (table: string, items: { id: string }[], idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    const ids = items.map((i) => i.id);
    [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
    await reorderSiblings(table, ids);
    load();
  };

  const totalVideos = useMemo(() => {
    let n = 0;
    for (const s of subjects) for (const t of s.topics ?? []) for (const st of t.subtopics ?? []) n += (st.videos?.length ?? 0);
    return n;
  }, [subjects]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!course) return <div className="p-8">Course not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild><Link to="/admin/courses"><ArrowLeft className="h-4 w-4 mr-1" /> Courses</Link></Button>
            <div>
              <h1 className="text-lg font-semibold">{course.name}</h1>
              <p className="text-xs text-muted-foreground">Content Manager · {totalVideos} videos</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={`/learn/${course.id}`} target="_blank" rel="noreferrer"><Eye className="h-4 w-4 mr-1" /> Preview as Student <ExternalLink className="h-3 w-3 ml-1" /></a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 p-4">
        {/* Tree */}
        <div className="bg-card border rounded-lg p-3 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm">Content Tree</h2>
            <Button size="sm" variant="ghost" onClick={() => setAddingSubject(true)}><Plus className="h-3 w-3 mr-1" /> Subject</Button>
          </div>
          {subjects.length === 0 && !addingSubject && <p className="text-xs text-muted-foreground">No subjects yet. Add one to start.</p>}
          <div className="space-y-1">
            {addingSubject && (
              <InlineAddInput placeholder="Subject name" onSubmit={createSubject} onCancel={() => setAddingSubject(false)} indent={0} />
            )}
            {subjects.map((subject, si) => {
              const sOpen = expanded.has(subject.id);
              const subjVideos = (subject.topics ?? []).reduce((a, t) => a + (t.subtopics ?? []).reduce((b, st) => b + (st.videos?.length ?? 0), 0), 0);
              return (
                <div key={subject.id}>
                  <NodeRow
                    open={sOpen}
                    onToggle={() => toggle(subject.id)}
                    selected={selected?.id === subject.id}
                    onSelect={() => setSelected({ kind: "subject", id: subject.id, data: subject })}
                    icon={subject.icon}
                    label={subject.name}
                    badge={`${subjVideos} videos`}
                    onUp={() => move("course_subjects", subjects, si, -1)}
                    onDown={() => move("course_subjects", subjects, si, 1)}
                    onRename={() => openRename("course_subjects", subject.id, subject.name, "subject")}
                    onDelete={() => remove("course_subjects", subject.id, "subject")}
                    depth={0}
                  />
                  {sOpen && (
                    <div className="ml-4">
                      {(subject.topics ?? []).map((topic, ti) => {
                        const tOpen = expanded.has(topic.id);
                        const tVideos = (topic.subtopics ?? []).reduce((b, st) => b + (st.videos?.length ?? 0), 0);
                        return (
                          <div key={topic.id}>
                            <NodeRow
                              open={tOpen}
                              onToggle={() => toggle(topic.id)}
                              selected={selected?.id === topic.id}
                              onSelect={() => setSelected({ kind: "topic", id: topic.id, data: topic, subject })}
                              label={topic.name}
                              badge={`${tVideos} videos`}
                              onUp={() => move("course_topics", subject.topics ?? [], ti, -1)}
                              onDown={() => move("course_topics", subject.topics ?? [], ti, 1)}
                              onRename={() => openRename("course_topics", topic.id, topic.name, "topic")}
                              onDelete={() => remove("course_topics", topic.id, "topic")}
                              depth={1}
                            />
                            {tOpen && (
                              <div className="ml-4">
                                {(topic.subtopics ?? []).map((subtopic, sti) => (
                                  <NodeRow
                                    key={subtopic.id}
                                    open={false}
                                    onToggle={() => {}}
                                    selected={selected?.id === subtopic.id}
                                    onSelect={() => setSelected({ kind: "subtopic", id: subtopic.id, data: subtopic, topic, subject })}
                                    label={subtopic.name}
                                    badge={`${subtopic.videos?.length ?? 0}📹 ${subtopic.pdfs?.length ?? 0}📄${subtopic.quiz ? " ✓Q" : ""}`}
                                    onUp={() => move("course_subtopics", topic.subtopics ?? [], sti, -1)}
                                    onDown={() => move("course_subtopics", topic.subtopics ?? [], sti, 1)}
                                    onRename={() => openRename("course_subtopics", subtopic.id, subtopic.name, "subtopic")}
                                    onDelete={() => remove("course_subtopics", subtopic.id, "subtopic")}
                                    depth={2}
                                    leaf
                                  />
                                ))}
                                {addingSubtopicFor === topic.id ? (
                                  <InlineAddInput placeholder="Subtopic name" onSubmit={(n) => createSubtopic(topic, n)} onCancel={() => setAddingSubtopicFor(null)} indent={6} />
                                ) : (
                                  <button onClick={() => setAddingSubtopicFor(topic.id)} className="ml-6 text-xs text-primary hover:underline py-1">+ Add Subtopic</button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {addingTopicFor === subject.id ? (
                        <InlineAddInput placeholder="Topic name" onSubmit={(n) => createTopic(subject, n)} onCancel={() => setAddingTopicFor(null)} indent={2} />
                      ) : (
                        <button onClick={() => setAddingTopicFor(subject.id)} className="ml-2 text-xs text-primary hover:underline py-1">+ Add Topic</button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="bg-card border rounded-lg p-4 min-h-[60vh]">
          {!selected && <EmptyEditor />}
          {selected?.kind === "subject" && <SubjectEditor subject={selected.data} onSaved={load} />}
          {selected?.kind === "topic" && <TopicEditor topic={selected.data} subject={selected.subject} onSaved={load} />}
          {selected?.kind === "subtopic" && (
            <SubtopicEditor
              subtopic={selected.data}
              topic={selected.topic}
              subject={selected.subject}
              courseId={courseId!}
              onSaved={load}
            />
          )}
        </div>
      </div>

      <Dialog open={!!renameTarget} onOpenChange={(o) => { if (!o) setRenameTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename {renameTarget?.label}</DialogTitle></DialogHeader>
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitRename(); }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button onClick={submitRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </div>
  );
};

function InlineAddInput({ placeholder, onSubmit, onCancel, indent }: {
  placeholder: string; onSubmit: (name: string) => void; onCancel: () => void; indent: number;
}) {
  const [value, setValue] = useState("");
  return (
    <div className="flex items-center gap-1 py-1" style={{ paddingLeft: indent * 8 }}>
      <Input
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit(value);
          else if (e.key === "Escape") onCancel();
        }}
        onBlur={() => { if (!value.trim()) onCancel(); }}
        className="h-7 text-sm"
      />
      <Button size="sm" className="h-7" onClick={() => onSubmit(value)}>Add</Button>
      <Button size="sm" variant="ghost" className="h-7" onClick={onCancel}>✕</Button>
    </div>
  );
}

function NodeRow(props: {
  open: boolean; onToggle: () => void; selected: boolean; onSelect: () => void;
  icon?: string | null; label: string; badge?: string;
  onUp: () => void; onDown: () => void; onRename: () => void; onDelete: () => void;
  depth: number; leaf?: boolean;
}) {
  return (
    <div className={`group flex items-center gap-1 px-2 py-1.5 rounded hover:bg-muted/50 ${props.selected ? "bg-muted" : ""}`}>
      {!props.leaf ? (
        <button onClick={props.onToggle} className="p-0.5">{props.open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}</button>
      ) : <span className="w-4" />}
      <GripVertical className="h-3 w-3 text-muted-foreground/40" />
      <button onClick={props.onSelect} className="flex-1 text-left text-sm truncate">
        {props.icon && <span className="mr-1">{props.icon}</span>}{props.label}
      </button>
      {props.badge && <span className="text-[10px] text-muted-foreground">{props.badge}</span>}
      <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
        <button onClick={props.onUp} title="Move up" className="text-xs px-1">↑</button>
        <button onClick={props.onDown} title="Move down" className="text-xs px-1">↓</button>
        <button onClick={props.onRename} title="Rename" className="text-xs px-1"><Pencil className="h-3 w-3" /></button>
        <button onClick={props.onDelete} title="Delete" className="text-xs px-1 text-destructive"><Trash2 className="h-3 w-3" /></button>
      </div>
    </div>
  );
}

function EmptyEditor() {
  return (
    <div className="flex items-center justify-center h-full text-center text-sm text-muted-foreground">
      <div>
        <p className="mb-2">Select a node on the left to edit it.</p>
        <p className="text-xs">Hierarchy: Subject → Topic → Subtopic → Videos / PDFs / Quiz</p>
      </div>
    </div>
  );
}

function SubjectEditor({ subject, onSaved }: { subject: CourseSubject; onSaved: () => void }) {
  const [name, setName] = useState(subject.name);
  const [icon, setIcon] = useState(subject.icon ?? "");
  const [color, setColor] = useState(subject.color ?? "");
  useEffect(() => { setName(subject.name); setIcon(subject.icon ?? ""); setColor(subject.color ?? ""); }, [subject.id]);
  const save = async () => {
    const { error } = await supabase.from("course_subjects" as any).update({ name, icon: icon || null, color: color || null }).eq("id", subject.id);
    if (error) return toast.error(error.message);
    toast.success("Saved"); onSaved();
  };
  const totals = useMemo(() => {
    let t = 0, v = 0, p = 0;
    for (const topic of subject.topics ?? []) { for (const st of topic.subtopics ?? []) { t++; v += st.videos?.length ?? 0; p += st.pdfs?.length ?? 0; } }
    return { topics: subject.topics?.length ?? 0, subtopics: t, videos: v, pdfs: p };
  }, [subject]);
  return (
    <div className="max-w-xl space-y-3">
      <h2 className="font-semibold">Subject</h2>
      <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Icon (emoji)</Label><Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="⚛️" /></div>
        <div><Label>Color</Label><Input type="color" value={color || "#3B82F6"} onChange={(e) => setColor(e.target.value)} /></div>
      </div>
      <Button onClick={save}>Save</Button>
      <div className="pt-3 text-xs text-muted-foreground">📊 {totals.topics} topics · {totals.subtopics} subtopics · {totals.videos} videos · {totals.pdfs} PDFs</div>
    </div>
  );
}

function TopicEditor({ topic, subject, onSaved }: { topic: CourseTopic; subject: CourseSubject; onSaved: () => void }) {
  const [name, setName] = useState(topic.name);
  useEffect(() => { setName(topic.name); }, [topic.id]);
  const save = async () => {
    const { error } = await supabase.from("course_topics" as any).update({ name }).eq("id", topic.id);
    if (error) return toast.error(error.message);
    toast.success("Saved"); onSaved();
  };
  const totals = useMemo(() => {
    let v = 0; for (const st of topic.subtopics ?? []) v += st.videos?.length ?? 0;
    return { subtopics: topic.subtopics?.length ?? 0, videos: v };
  }, [topic]);
  return (
    <div className="max-w-xl space-y-3">
      <div className="text-xs text-muted-foreground">{subject.name} › {topic.name}</div>
      <h2 className="font-semibold">Topic</h2>
      <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
      <Button onClick={save}>Save</Button>
      <div className="pt-3 text-xs text-muted-foreground">📊 {totals.subtopics} subtopics · {totals.videos} videos</div>
    </div>
  );
}

function SubtopicEditor({ subtopic, topic, subject, courseId, onSaved }: {
  subtopic: CourseSubtopic; topic: CourseTopic; subject: CourseSubject; courseId: string; onSaved: () => void;
}) {
  const [name, setName] = useState(subtopic.name);
  const [desc, setDesc] = useState(subtopic.description ?? "");
  useEffect(() => { setName(subtopic.name); setDesc(subtopic.description ?? ""); }, [subtopic.id]);
  const save = async () => {
    const { error } = await supabase.from("course_subtopics" as any).update({ name, description: desc || null }).eq("id", subtopic.id);
    if (error) return toast.error(error.message);
    toast.success("Saved"); onSaved();
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">{subject.name} › {topic.name} › {subtopic.name}</div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 max-w-2xl">
        <div className="space-y-2">
          <div><Label>Subtopic name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} /></div>
        </div>
        <Button onClick={save} className="self-end">Save</Button>
      </div>

      <Tabs defaultValue="videos">
        <TabsList>
          <TabsTrigger value="videos"><Video className="h-3 w-3 mr-1" /> Videos ({subtopic.videos?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="pdfs"><FileText className="h-3 w-3 mr-1" /> PDFs ({subtopic.pdfs?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="videos"><VideoTab subtopic={subtopic} courseId={courseId} onSaved={onSaved} /></TabsContent>
        <TabsContent value="pdfs"><PdfTab subtopic={subtopic} courseId={courseId} onSaved={onSaved} /></TabsContent>
      </Tabs>

    </div>
  );
}

function VideoTab({ subtopic, courseId, onSaved }: { subtopic: CourseSubtopic; courseId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubtopicVideo | null>(null);
  const del = async (v: SubtopicVideo) => {
    if (!(window.confirm(`Delete "${v.title}"?`))) return;
    await supabase.from("subtopic_videos" as any).delete().eq("id", v.id);
    toast.success("Video deleted"); onSaved();
  };
  const move = async (idx: number, dir: -1 | 1) => {
    const arr = [...(subtopic.videos ?? [])];
    const ni = idx + dir; if (ni < 0 || ni >= arr.length) return;
    [arr[idx], arr[ni]] = [arr[ni], arr[idx]];
    await reorderSiblings("subtopic_videos", arr.map((v) => v.id));
    onSaved();
  };
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-3 w-3 mr-1" /> Add Video</Button>
      </div>
      <div className="space-y-2">
        {(subtopic.videos ?? []).map((v, i) => (
          <div key={v.id} className="flex items-center gap-3 p-2 border rounded">
            <img src={v.thumbnail_url || (v.youtube_video_id ? getYouTubeThumbnail(v.youtube_video_id) : "")} alt="" className="w-24 h-14 object-cover rounded bg-muted" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{v.title}</div>
              <div className="text-xs text-muted-foreground">{v.duration_label || "—"} · {v.is_preview ? "🔓 Preview" : "🔒 Enrolled"}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => move(i, -1)}>↑</Button>
            <Button size="sm" variant="ghost" onClick={() => move(i, 1)}>↓</Button>
            <Button size="sm" variant="ghost" onClick={() => { setEditing(v); setOpen(true); }}><Pencil className="h-3 w-3" /></Button>
            <Button size="sm" variant="ghost" onClick={() => del(v)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
          </div>
        ))}
        {(subtopic.videos ?? []).length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No videos yet.</p>}
      </div>
      <VideoDialog open={open} onOpenChange={setOpen} subtopicId={subtopic.id} courseId={courseId} video={editing} onSaved={() => { setOpen(false); onSaved(); }} />
    </div>
  );
}

function VideoDialog({ open, onOpenChange, subtopicId, courseId, video, onSaved }: {
  open: boolean; onOpenChange: (b: boolean) => void; subtopicId: string; courseId: string; video: SubtopicVideo | null; onSaved: () => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("");
  const [desc, setDesc] = useState("");
  const [preview, setPreview] = useState(false);
  const [ytId, setYtId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setUrl(video?.youtube_url ?? ""); setTitle(video?.title ?? ""); setDuration(video?.duration_label ?? "");
      setDesc(video?.description ?? ""); setPreview(video?.is_preview ?? false); setYtId(video?.youtube_video_id ?? null);
    }
  }, [open, video]);

  const onUrlChange = async (v: string) => {
    setUrl(v);
    const id = extractYouTubeId(v);
    setYtId(id);
    if (id && !title) {
      const t = await fetchYouTubeTitle(v);
      if (t) setTitle(t);
    }
  };

  const save = async () => {
    if (!url || !title) return toast.error("URL and title required");
    setSaving(true);
    const payload = {
      course_id: courseId, subtopic_id: subtopicId, title, youtube_url: url,
      youtube_video_id: ytId, thumbnail_url: ytId ? getYouTubeThumbnail(ytId) : null,
      duration_label: duration || null, description: desc || null, is_preview: preview,
    };
    const { error } = video
      ? await supabase.from("subtopic_videos" as any).update(payload).eq("id", video.id)
      : await supabase.from("subtopic_videos" as any).insert({ ...payload, position: 9999 });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved"); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{video ? "Edit Video" : "Add YouTube Video"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>YouTube URL *</Label><Input value={url} onChange={(e) => onUrlChange(e.target.value)} placeholder="https://youtu.be/..." /></div>
          {ytId && <img src={getYouTubeThumbnail(ytId)} alt="" className="w-full max-w-xs rounded border" />}
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Duration label</Label><Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="45:30" /></div>
          <div><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} /></div>
          <div className="flex items-center gap-2"><Switch checked={preview} onCheckedChange={setPreview} /><Label>Free preview (watchable without enrollment)</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PdfTab({ subtopic, courseId, onSaved }: { subtopic: CourseSubtopic; courseId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const save = async () => {
    if (!title || !fileUrl) return toast.error("Title and URL required");
    const { error } = await supabase.from("subtopic_pdfs" as any).insert({
      course_id: courseId, subtopic_id: subtopic.id, title, file_url: fileUrl, position: (subtopic.pdfs?.length ?? 0),
    });
    if (error) return toast.error(error.message);
    setTitle(""); setFileUrl(""); setOpen(false); toast.success("PDF added"); onSaved();
  };
  const del = async (p: SubtopicPdf) => {
    if (!(window.confirm(`Delete "${p.title}"?`))) return;
    await supabase.from("subtopic_pdfs" as any).delete().eq("id", p.id);
    toast.success("Deleted"); onSaved();
  };
  return (
    <div className="space-y-2">
      <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)}><Plus className="h-3 w-3 mr-1" /> Add PDF</Button></div>
      {(subtopic.pdfs ?? []).map((p) => (
        <div key={p.id} className="flex items-center gap-3 p-2 border rounded">
          <FileText className="h-4 w-4" />
          <a href={p.file_url} target="_blank" rel="noreferrer" className="flex-1 text-sm truncate hover:underline">{p.title}</a>
          <Button size="sm" variant="ghost" onClick={() => del(p)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
        </div>
      ))}
      {(subtopic.pdfs ?? []).length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No PDFs yet.</p>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add PDF</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><Label>File URL *</Label><Input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>Add</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}




export default AdminCourseHierarchyPage;
