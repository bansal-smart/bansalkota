import { Link } from "react-router-dom";
import { Users, MessageCircle, BarChart3, Sparkles, TrendingUp, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

type Kpis = {
  studentCount: number;
  openChats: number;
  avgProgress: number | null;
  avgScore: number | null;
  recentAttempts: number;
};

const MentorDashboard = () => {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let ignore = false;

    (async () => {
      setLoading(true);

      // 1. Assigned students
      const { data: assignments } = await supabase
        .from("mentor_student_assignments")
        .select("student_id")
        .eq("mentor_id", user.id)
        .is("removed_at", null);
      const studentIds = (assignments ?? []).map((a) => a.student_id);
      const studentCount = studentIds.length;

      // 2. Open chats: distinct students with unread direct messages to mentor
      let openChats = 0;
      if (studentIds.length) {
        const { data: unread } = await supabase
          .from("mentor_messages")
          .select("sender_id")
          .eq("conversation_type", "direct")
          .eq("recipient_id", user.id)
          .is("read_at", null)
          .in("sender_id", studentIds);
        openChats = new Set((unread ?? []).map((m: any) => m.sender_id)).size;
      }

      // 3. Avg progress across enrollments of assigned students
      let avgProgress: number | null = null;
      if (studentIds.length) {
        const { data: enrolls } = await supabase
          .from("enrollments")
          .select("progress_percent")
          .in("user_id", studentIds)
          .eq("is_active", true);
        if (enrolls && enrolls.length) {
          const sum = enrolls.reduce((s, e: any) => s + (e.progress_percent ?? 0), 0);
          avgProgress = Math.round(sum / enrolls.length);
        }
      }

      // 4. Recent performance: avg test score (last 30 days) across students
      let avgScore: number | null = null;
      let recentAttempts = 0;
      if (studentIds.length) {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: attempts } = await supabase
          .from("test_attempts")
          .select("score, total_questions, correct_answers")
          .in("user_id", studentIds)
          .in("status", ["submitted", "auto_submitted"])
          .gte("submitted_at", since);
        const valid = (attempts ?? []).filter(
          (a: any) => (a.total_questions ?? 0) > 0,
        );
        recentAttempts = valid.length;
        if (valid.length) {
          const pct = valid.reduce(
            (s, a: any) => s + ((a.correct_answers ?? 0) / a.total_questions) * 100,
            0,
          );
          avgScore = Math.round(pct / valid.length);
        }
      }

      if (!ignore) {
        setKpis({ studentCount, openChats, avgProgress, avgScore, recentAttempts });
        setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [user]);

  const fmt = (v: number | null, suffix = "") =>
    v === null || v === undefined ? "—" : `${v}${suffix}`;

  const cards = [
    {
      label: "Assigned Students",
      value: loading ? null : kpis?.studentCount ?? 0,
      icon: Users,
      href: "/mentor/students",
      hint: "Active mentees",
    },
    {
      label: "Open Chats",
      value: loading ? null : kpis?.openChats ?? 0,
      icon: MessageCircle,
      href: "/mentor/chats",
      hint: "Students awaiting reply",
    },
    {
      label: "Avg. Course Progress",
      value: loading ? null : kpis?.avgProgress,
      suffix: "%",
      icon: BarChart3,
      href: "/mentor/performance",
      hint: "Across active enrollments",
    },
    {
      label: "Recent Test Score",
      value: loading ? null : kpis?.avgScore,
      suffix: "%",
      icon: TrendingUp,
      href: "/mentor/performance",
      hint: `${kpis?.recentAttempts ?? 0} attempts · last 30 days`,
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black text-foreground">Mentor Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Guide your assigned students, chat with them, and review their progress.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1.5 text-xs font-semibold text-secondary">
          <Sparkles className="h-3.5 w-3.5" />
          Mentor Portal
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            to={c.href}
            className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-secondary/50"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{c.label}</p>
              <c.icon className="h-4 w-4 text-secondary" />
            </div>
            <p className="mt-3 font-display text-2xl font-black text-foreground">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                fmt(c.value as number | null, c.suffix ?? "")
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
          </Link>
        ))}
      </div>

      {!loading && kpis?.studentCount === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            You don't have any assigned students yet. An admin will assign mentees to your group soon.
          </p>
        </div>
      )}
    </div>
  );
};

export default MentorDashboard;
