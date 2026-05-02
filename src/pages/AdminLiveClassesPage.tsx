import { useEffect, useMemo, useState } from "react";
import { Video, Calendar, Loader2, Plus, X, Trash2, Search, Pencil, ExternalLink } from "lucide-react";
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
  target_exam: string | null;
  created_by: string | null;
};

type Teacher = { user_id: string; full_name: string | null };

const statusColors: Record<string, string> = {
  live: "bg-destructive text-white",
  scheduled: "bg-primary/20 text-primary",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground line-through",
};

type FormState = {
  title: string;
  subject: string;
  teacherId: string;
  starts_at: string;
  duration_minutes: number;
  meeting_url: string;
  description: string;
  target_exam: string;
};

const emptyForm: FormState = {
  title: "",
  subject: "",
  teacherId: "",
  starts_at: "",
  duration_minutes: 60,
  meeting_url: "",
  description: "",
  target_exam: "",
};

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
};

const AdminLiveClassesPage = () => {
  const [classes, setClasses] = useState<AdminLive[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [teacherFilter, setTeacherFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const [classesRes, rolesRes] = await Promise.all([
      supabase
        .from("live_classes")
        .select(
          "id, title, subject, educator_name, status, starts_at, ends_at, meeting_url, description, target_exam, created_by",
        )
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return classes.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (teacherFilter !== "all" && c.created_by !== teacherFilter) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        (c.educator_name ?? "").toLowerCase().includes(q)
      );
    });
  }, [classes, search, statusFilter, teacherFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (cls: AdminLive) => {
    const start = new Date(cls.starts_at).getTime();
    const end = cls.ends_at ? new Date(cls.ends_at).getTime() : start + 60 * 60 * 1000;
    const duration = Math.max(15, Math.round((end - start) / 60000));
    setEditingId(cls.id);
    setForm({
      title: cls.title,
      subject: cls.subject,
      teacherId: cls.created_by ?? "",
      starts_at: toLocalInput(cls.starts_at),
      duration_minutes: duration,
      meeting_url: cls.meeting_url ?? "",
      description: cls.description ?? "",
      target_exam: cls.target_exam ?? "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

      const payload = {
        title: form.title,
        subject: form.subject,
        educator_name: teacher?.full_name || "Educator",
        target_exam: form.target_exam || null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        meeting_url: form.meeting_url || null,
        description: form.description || null,
        created_by: form.teacherId,
        scheduled_by: adminId,
      };

      if (editingId) {
        const { error } = await supabase.from("live_classes").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Live class updated");
      } else {
        const { error } = await supabase
          .from("live_classes")
          .insert({ ...payload, status: "scheduled" });
        if (error) throw error;
        toast.success("Live class scheduled");
      }
      closeForm();
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save class");
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

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from("live_classes").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Marked as ${status}`);
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
            onClick={openCreate}
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

      {/* Filters */}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, subject or teacher…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"
        >
          <option value="all">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={teacherFilter}
          onChange={(e) => setTeacherFilter(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none"
        >
          <option value="all">All teachers</option>
          {teachers.map((t) => (
            <option key={t.user_id} value={t.user_id}>
              {t.full_name || "Unnamed"}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {classes.length === 0 ? "No live classes scheduled yet." : "No classes match the filters."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((cls) => (
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
                  {cls.target_exam ? ` · ${cls.target_exam}` : ""}
                </p>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground items-center">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {new Date(cls.starts_at).toLocaleString()}
                  </span>
                  {cls.meeting_url && (
                    <a
                      href={cls.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Meeting link
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <select
                  value={cls.status}
                  onChange={(e) => handleStatusChange(cls.id, e.target.value)}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs outline-none"
                  title="Change status"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  onClick={() => openEdit(cls)}
                  className="rounded-md border border-border p-2 text-foreground hover:bg-muted"
                  title="Edit class"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(cls.id)}
                  className="rounded-md border border-border p-2 text-destructive hover:bg-destructive/10"
                  title="Delete class"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule / Edit dialog */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4"
          onClick={closeForm}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">
                {editingId ? "Edit live class" : "Schedule class on behalf of teacher"}
              </p>
              <button type="button" onClick={closeForm} className="text-muted-foreground hover:text-foreground">
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
                onClick={closeForm}
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
                {editingId ? "Save changes" : "Schedule"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminLiveClassesPage;
