import { useEffect, useState } from "react";
import { Video, Plus, Calendar, Loader2, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { usePagination } from "@/hooks/usePagination";
import TablePagination from "@/components/TablePagination";

type LiveClass = {
  id: string;
  title: string;
  subject: string;
  educator_name: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  meeting_url: string | null;
  description: string | null;
};

const TeacherLiveClassesPage = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Physics");
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("live_classes")
      .select("id, title, subject, educator_name, status, starts_at, ends_at, meeting_url, description")
      .eq("created_by", user.id)
      .order("starts_at", { ascending: false });
    setClasses((data ?? []) as LiveClass[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const submit = async () => {
    if (!user) return;
    if (!title.trim() || !startsAt) return toast.error("Title and start time required");
    setSubmitting(true);
    const startISO = new Date(startsAt).toISOString();
    const endISO = new Date(new Date(startsAt).getTime() + duration * 60000).toISOString();
    const educatorName = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "Educator";
    const { error } = await supabase.from("live_classes").insert({
      title,
      subject,
      educator_name: educatorName,
      starts_at: startISO,
      ends_at: endISO,
      meeting_url: meetingUrl || null,
      description: description || null,
      status: "scheduled",
      created_by: user.id,
    });
    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }
    toast.success("Class scheduled");
    setShowCreate(false);
    setTitle("");
    setStartsAt("");
    setMeetingUrl("");
    setDescription("");
    setSubmitting(false);
    load();
  };

  const markComplete = async (id: string) => {
    await supabase.from("live_classes").update({ status: "completed" }).eq("id", id);
    toast.success("Marked completed");
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("live_classes").delete().eq("id", id);
    toast.success("Class removed");
    load();
  };

  const filtered = classes.filter((c) =>
    tab === "upcoming" ? c.status !== "completed" : c.status === "completed",
  );
  const { page, setPage, totalPages, paged, total, pageSize } = usePagination(filtered, 8);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black font-display">Live Classes</h1>
          <p className="text-white/90 text-sm mt-1">Schedule and manage your live sessions</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/30 transition-colors"
        >
          <Plus className="h-4 w-4" /> Schedule Class
        </button>
      </div>

      <div className="flex gap-2">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors capitalize ${
              tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Video className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-foreground">No {tab} classes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4 flex items-start gap-4 flex-wrap">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Video className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground">{c.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {c.subject} · <Calendar className="inline h-3 w-3" /> {new Date(c.starts_at).toLocaleString()}
                </p>
                {c.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>}
              </div>
              <div className="flex gap-2">
                {c.status !== "completed" && (
                  <button onClick={() => markComplete(c.id)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    Mark complete
                  </button>
                )}
                <button onClick={() => remove(c.id)} className="rounded-lg border border-destructive/40 p-1.5 text-destructive hover:bg-destructive/5">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-card p-5 border border-border shadow-xl space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Schedule a class</h3>
              <button onClick={() => setShowCreate(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Subject</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
                <option>Physics</option>
                <option>Chemistry</option>
                <option>Mathematics</option>
                <option>Biology</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-foreground">Starts at</label>
                <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground">Duration (min)</label>
                <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value) || 60)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Meeting URL</label>
              <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.jit.si/..." className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
              <p className="text-[10px] text-muted-foreground mt-1">Use Jitsi, Meet, Zoom or any meeting link.</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">Description (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none resize-none" />
            </div>
            <button disabled={submitting} onClick={submit} className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Schedule"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherLiveClassesPage;
