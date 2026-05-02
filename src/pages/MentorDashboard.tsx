import { Link } from "react-router-dom";
import { Users, MessageCircle, BarChart3, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Placeholder mentor home. v1 just confirms portal access and surfaces the
 * count of students the admin has assigned to this mentor. Real chat + student
 * detail pages land in Phase 4.
 */
const MentorDashboard = () => {
  const { user } = useAuth();
  const [studentCount, setStudentCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    (async () => {
      const { count } = await supabase
        .from("mentor_student_assignments")
        .select("id", { count: "exact", head: true })
        .eq("mentor_id", user.id)
        .is("removed_at", null);
      if (!ignore) setStudentCount(count ?? 0);
    })();
    return () => {
      ignore = true;
    };
  }, [user]);

  const cards = [
    { label: "Assigned Students", value: studentCount ?? "—", icon: Users, href: "/mentor/students" },
    { label: "Chats", value: "Open", icon: MessageCircle, href: "/mentor/chats" },
    { label: "Performance", value: "View", icon: BarChart3, href: "/mentor/performance" },
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <p className="mt-3 font-display text-2xl font-black text-foreground">{c.value}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Chat, student detail and performance views ship in the next phase.
        </p>
      </div>
    </div>
  );
};

export default MentorDashboard;
