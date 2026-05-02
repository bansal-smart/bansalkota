import { useEffect, useMemo, useState } from "react";
import { Video, Calendar, Loader2, Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type AdminLive = {
  id: string;
  title: string;
  subject: string;
  educator_name: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  meeting_url: string | null;
  description: string | null;
  created_by: string | null;
};

type Teacher = { user_id: string; full_name: string | null };

const statusColors: Record<string, string> = {
  live: "bg-destructive text-white",
  scheduled: "bg-primary/20 text-primary",
  completed: "bg-muted text-muted-foreground",
};

const AdminLiveClassesPage = () => {
  const [classes, setClasses] = useState<AdminLive[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    subject: "",
    teacherId: "",
    starts_at: "",
    duration_minutes: 60,
    meeting_url: "",
    description: "",
    target_exam: "",
  });

  const load = async () => {
    setLoading(true);
    const [classesRes, rolesRes] = await Promise.all([
      supabase
        .from("live_classes")
        .select("id, title, subject, educator_name, status, starts_at, ends_at, meeting_url, description, created_by")
        .order("starts_at", { ascending: false }),
      supabase.from("user_roles").select("user_id").eq("role", "teacher"),
    ]);
    const teacherIds = (rolesRes.data ?? []).map((r) => r.user_id);
    const { data: profiles } = teacherIds.length
      ? await supabase.from("profiles").select("user_id, full_name").in("user_id", teacherIds)
      : { data: [] as Teacher[] };

    setClasses((classesRes.data ?? []) as AdminLive[]);
    setTeachers(
      ((profiles ?? []) as Teacher[]).sort((a, b) =>
        (a.full_name ?? "").localeCompare(b.full_name ?? ""),
      ),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(() => {
    const now = new Date();
    return {
      live: classes.filter((r) => r.status === "live").length,
      upcoming: classes.filter((r) => r.status === "scheduled" && new Date(r.starts_at) > now).length,
      total: classes.length,
    };
  }, [classes]);

  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.user_id, t])), [teachers]);

  const resetForm = () =>
    setForm({
      title: "",
      subject: "",
      teacherId: "",
      starts_at: "",
      duration_minutes: 60,
      meeting_url: "",
      description: "",
      target_exam: "",
    });

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.subject || !form.teacherId || !form.starts_at) {
      toast.error("Title, subject, teacher and start time are required");
      return;
    }
    setSubmitting(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const adminId = userRes.user?.id;
      const teacher = teacherMap.get(form.teacherId);
      const startsAt = new Date(form.starts_at);
      const endsAt = new Date(startsAt.getTime() + form.duration_minutes * 60 * 1000);

      const { error } = await supabase.from("live_classes").insert({
        title: form.title,
        subject: form.subject,
        educator_name: teacher?.full_name || "Educator",
        target_exam: form.target_exam || null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        meeting_url: form.meeting_url || null,
        description: form.description || null,
        status: "scheduled",
        created_by: form.teacherId,
        scheduled_by: adminId,
      });
      if (error) throw error;
      toast.success("Live class scheduled");
      setShowForm(false);
      resetForm();
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to schedule class");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this scheduled class? This cannot be undone.")) return;
    const { error } = await supabase.from("live_classes").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Class deleted");
    load();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-black font-display">Live Classes</h1>
            <p className="text-white/90 text-sm mt-1">Schedule and monitor classes on behalf of teachers</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-primary hover:bg-white/90"
          >
            <Plus className="h-4 w-4" /> Schedule class
          </button>
        </div>
        <div className="flex gap-4 mt-4 flex-wrap">
          <div className="rounded-xl bg-white/20 px-4 py-2 text-center">
            <p className="text-lg font-bold">{counts.live}</p>
            <p className="text-[10px] text-white/80">Live now</p>
          </div>
          <div className="rounded-xl bg-white/20 px-4 py-2 text-center">
            <p className="text-lg font-bold">{counts.upcoming}</p>
            <p className="text-[10px] text-white/80">Upcoming</p>
          </div>
          <div className="rounded-xl bg-white/20 px-4 py-2 text-center">
            <p className="text-lg font-bold">{counts.total}</p>
            <p className="text-[10px] text-white/80">Total</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : classes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No live classes scheduled yet.</p>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Video className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-foreground truncate">{cls.title}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      statusColors[cls.status] ?? statusColors.scheduled
                    }`}
                  >
                    {cls.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {cls.educator_name} · {cls.subject}
                </p>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {new Date(cls.starts_at).toLocaleString()}
                  </span>
                </div>
              </div>
              {cls.status !== "completed" && (
                <button
                  onClick={() => handleDelete(cls.id)}
                  className="rounded-md border border-border p-2 text-destructive hover:bg-destructive/10"
                  title="Delete class"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Schedule dialog */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4"
          onClick={() => setShowForm(false)}
        >
          <form
            onSubmit={handleSchedule}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Schedule class on behalf of teacher</p>
              <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Thermodynamics Crash Class"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Teacher</label>
                  <select
                    required
                    value={form.teacherId}
                    onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="">Select teacher</option>
                    {teachers.map((t) => (
                      <option key={t.user_id} value={t.user_id}>
                        {t.full_name || "Unnamed teacher"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Subject</label>
                  <input
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    placeholder="Physics"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Starts at</label>
                  <input
                    required
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Duration (mins)</label>
                  <input
                    required
                    type="number"
                    min={15}
                    step={5}
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Target exam</label>
                  <input
                    value={form.target_exam}
                    onChange={(e) => setForm({ ...form, target_exam: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    placeholder="JEE Main"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Meeting URL</label>
                  <input
                    value={form.meeting_url}
                    onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    placeholder="https://…"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Topics covered, prerequisites…"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Schedule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminLiveClassesPage;
