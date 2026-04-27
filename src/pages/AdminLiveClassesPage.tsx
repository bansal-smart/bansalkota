import { useEffect, useState } from "react";
import { Video, Calendar, Users, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type AdminLive = {
  id: string;
  title: string;
  subject: string;
  educator_name: string;
  status: string;
  starts_at: string;
};

const statusColors: Record<string, string> = {
  live: "bg-destructive text-white",
  scheduled: "bg-primary/20 text-primary",
  completed: "bg-muted text-muted-foreground",
};

const AdminLiveClassesPage = () => {
  const [classes, setClasses] = useState<AdminLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ live: 0, upcoming: 0, total: 0 });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("live_classes")
        .select("id, title, subject, educator_name, status, starts_at")
        .order("starts_at", { ascending: false });
      const rows = (data ?? []) as AdminLive[];
      setClasses(rows);
      const now = new Date();
      setCounts({
        live: rows.filter((r) => r.status === "live").length,
        upcoming: rows.filter((r) => r.status === "scheduled" && new Date(r.starts_at) > now).length,
        total: rows.length,
      });
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white">
        <h1 className="text-2xl font-black font-display">Live Classes</h1>
        <p className="text-white/90 text-sm mt-1">Monitor all scheduled and ongoing live sessions</p>
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
        <p className="text-sm text-muted-foreground text-center py-10">No live classes scheduled.</p>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <div key={cls.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Video className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-foreground truncate">{cls.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[cls.status] ?? statusColors.scheduled}`}>{cls.status}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{cls.educator_name} · {cls.subject}</p>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {new Date(cls.starts_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminLiveClassesPage;
