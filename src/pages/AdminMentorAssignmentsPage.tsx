import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search, UserMinus, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Profile = { user_id: string; full_name: string | null };
type Mentor = Profile & { studentCount: number };
type Assignment = { id: string; mentor_id: string; student_id: string; assigned_at: string };

const AdminMentorAssignmentsPage = () => {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMentor, setSelectedMentor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [mentorRoles, studentRoles, asg] = await Promise.all([
      supabase.from("user_roles").select("user_id").eq("role", "mentor"),
      supabase.from("user_roles").select("user_id").eq("role", "student"),
      supabase.from("mentor_student_assignments").select("id, mentor_id, student_id, assigned_at").is("removed_at", null),
    ]);

    const mentorIds = (mentorRoles.data ?? []).map((r) => r.user_id);
    const studentIds = (studentRoles.data ?? []).map((r) => r.user_id);
    const allIds = Array.from(new Set([...mentorIds, ...studentIds]));

    const { data: profiles } = allIds.length
      ? await supabase.from("profiles").select("user_id, full_name").in("user_id", allIds)
      : { data: [] as Profile[] };

    const profilesMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
    const asgList = (asg.data ?? []) as Assignment[];

    const mentorList: Mentor[] = mentorIds.map((id) => ({
      user_id: id,
      full_name: profilesMap.get(id)?.full_name ?? null,
      studentCount: asgList.filter((a) => a.mentor_id === id).length,
    }));

    setMentors(mentorList.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "")));
    setStudents(
      studentIds
        .map((id) => ({ user_id: id, full_name: profilesMap.get(id)?.full_name ?? null }))
        .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "")),
    );
    setAssignments(asgList);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedMentor && mentors[0]) setSelectedMentor(mentors[0].user_id);
  }, [mentors, selectedMentor]);

  const studentsById = useMemo(() => new Map(students.map((s) => [s.user_id, s])), [students]);
  const mentorAssignments = useMemo(
    () => assignments.filter((a) => a.mentor_id === selectedMentor),
    [assignments, selectedMentor],
  );
  const assignedStudentIds = useMemo(
    () => new Set(mentorAssignments.map((a) => a.student_id)),
    [mentorAssignments],
  );
  const availableStudents = useMemo(
    () =>
      students
        .filter((s) => !assignedStudentIds.has(s.user_id))
        .filter((s) => (s.full_name ?? "").toLowerCase().includes(search.toLowerCase())),
    [students, assignedStudentIds, search],
  );

  const handleAssign = async (studentId: string) => {
    if (!selectedMentor) return;
    setAdding(studentId);
    const { data: userRes } = await supabase.auth.getUser();
    const adminId = userRes.user?.id;
    if (!adminId) {
      toast.error("Not authenticated");
      setAdding(null);
      return;
    }
    const { error } = await supabase
      .from("mentor_student_assignments")
      .insert({ mentor_id: selectedMentor, student_id: studentId, assigned_by: adminId });
    setAdding(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Student assigned");
    setShowAdd(false);
    load();
  };

  const handleRemove = async (assignmentId: string) => {
    const { error } = await supabase
      .from("mentor_student_assignments")
      .update({ removed_at: new Date().toISOString() })
      .eq("id", assignmentId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Student removed");
    load();
  };

  const selected = mentors.find((m) => m.user_id === selectedMentor);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-secondary via-primary to-accent p-6 text-white">
        <h1 className="text-2xl font-black font-display">Mentor Assignments</h1>
        <p className="text-white/90 text-sm mt-1">Assign students to mentors for 1:1 and group support.</p>
        <div className="flex gap-4 mt-4 flex-wrap">
          <div className="rounded-xl bg-white/20 px-4 py-2 text-center">
            <p className="text-lg font-bold">{mentors.length}</p>
            <p className="text-[10px] text-white/80">Mentors</p>
          </div>
          <div className="rounded-xl bg-white/20 px-4 py-2 text-center">
            <p className="text-lg font-bold">{assignments.length}</p>
            <p className="text-[10px] text-white/80">Active assignments</p>
          </div>
          <div className="rounded-xl bg-white/20 px-4 py-2 text-center">
            <p className="text-lg font-bold">{students.length - assignments.length}</p>
            <p className="text-[10px] text-white/80">Unassigned students</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : mentors.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm font-semibold text-foreground">No mentors yet</p>
          <p className="text-xs text-muted-foreground">Create a mentor account from the Users page first.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          {/* Mentors list */}
          <aside className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mentors</p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {mentors.map((m) => {
                const active = m.user_id === selectedMentor;
                return (
                  <button
                    key={m.user_id}
                    onClick={() => setSelectedMentor(m.user_id)}
                    className={`flex w-full items-center justify-between gap-2 border-b border-border/40 px-3 py-3 text-left transition-colors ${
                      active ? "bg-secondary/15" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{m.full_name || "Unnamed mentor"}</p>
                      <p className="text-[10px] text-muted-foreground">{m.studentCount} students</p>
                    </div>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {m.studentCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Selected mentor's students */}
          <section className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <p className="text-sm font-bold text-foreground">{selected?.full_name || "Mentor"}</p>
                <p className="text-xs text-muted-foreground">{mentorAssignments.length} assigned students</p>
              </div>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-3.5 w-3.5" /> Assign student
              </button>
            </div>
            {mentorAssignments.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">No students assigned to this mentor yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {mentorAssignments.map((a) => {
                  const stu = studentsById.get(a.student_id);
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{stu?.full_name || "Student"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Assigned {new Date(a.assigned_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemove(a.id)}
                        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <UserMinus className="h-3.5 w-3.5" /> Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* Add-student dialog */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 p-4" onClick={() => setShowAdd(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-foreground">Assign student to {selected?.full_name}</p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students…"
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </div>
            <div className="mt-3 max-h-[50vh] overflow-y-auto">
              {availableStudents.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">No matching students.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {availableStudents.map((s) => (
                    <li key={s.user_id} className="flex items-center justify-between gap-2 py-2">
                      <p className="truncate text-sm text-foreground">{s.full_name || "Student"}</p>
                      <button
                        onClick={() => handleAssign(s.user_id)}
                        disabled={adding === s.user_id}
                        className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                      >
                        {adding === s.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                        Assign
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={() => setShowAdd(false)}
              className="mt-4 w-full rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMentorAssignmentsPage;
