import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

type Student = { user_id: string; full_name: string | null; target_exam: string | null; class_level: string | null };

const MentorStudentsPage = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    (async () => {
      const { data: assignments } = await supabase
        .from("mentor_student_assignments")
        .select("student_id")
        .eq("mentor_id", user.id)
        .is("removed_at", null);
      const ids = (assignments ?? []).map((a) => a.student_id);
      const { data } = ids.length
        ? await supabase
            .from("profiles")
            .select("user_id, full_name, target_exam, class_level")
            .in("user_id", ids)
        : { data: [] as Student[] };
      if (!ignore) {
        setStudents((data ?? []) as Student[]);
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [user]);

  return (
    <div className="space-y-4 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black text-foreground">My Students</h1>
          <p className="text-sm text-muted-foreground">Students assigned to you by the admin team.</p>
        </div>
        <Link
          to="/mentor/chats"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Users className="h-4 w-4" />
          Open Group Chat
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : students.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No students assigned yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => {
            const initials = (s.full_name ?? "S")
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0]?.toUpperCase())
              .join("");
            return (
              <div key={s.user_id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/15 text-sm font-bold text-secondary">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{s.full_name || "Student"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {[s.target_exam, s.class_level].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </div>
                <Link
                  to="/mentor/chats"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/40"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Message
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MentorStudentsPage;
