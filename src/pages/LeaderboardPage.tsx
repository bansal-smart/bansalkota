import { useCallback, useEffect, useMemo, useState } from "react";
import { Trophy, Crown, Inbox, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Rating = {
  user_id: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  current_streak: number;
  best_streak: number;
  target_exam: string;
  updated_at: string;
};

type Row = Rating & {
  rank: number;
  name: string;
  matches: number;
  accuracy: number;
  initials: string;
  isYou: boolean;
};

const RANGE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "30", label: "Monthly" },
  { value: "7", label: "Weekly" },
];

const initialsOf = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]?.toUpperCase()).join("") || "?";

const EmptyState = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <div className="rounded-full bg-muted p-3 mb-3">
      <Inbox className="h-5 w-5 text-muted-foreground" />
    </div>
    <p className="text-sm font-semibold text-foreground">{title}</p>
    {hint && <p className="text-xs text-muted-foreground mt-1 max-w-xs">{hint}</p>}
  </div>
);

const LeaderboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [exams, setExams] = useState<string[]>([]);
  const [examFilter, setExamFilter] = useState<string>("all");
  const [rangeFilter, setRangeFilter] = useState<string>("all");

  const load = useCallback(async () => {
    const { data: r } = await supabase
      .from("compete_ratings")
      .select("user_id, rating, wins, losses, draws, current_streak, best_streak, target_exam, updated_at")
      .order("rating", { ascending: false })
      .limit(200);
    const list = (r ?? []) as Rating[];
    setRatings(list);
    setExams(Array.from(new Set(list.map(x => x.target_exam).filter(Boolean))));

    // Pull names from compete_matches (stored snapshots)
    const ids = Array.from(new Set(list.map(x => x.user_id)));
    if (ids.length) {
      const { data: m } = await supabase
        .from("compete_matches")
        .select("player1_id, player1_name, player2_id, player2_name")
        .or(`player1_id.in.(${ids.join(",")}),player2_id.in.(${ids.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(500);
      const map: Record<string, string> = {};
      (m ?? []).forEach((row: any) => {
        if (row.player1_id && row.player1_name && !map[row.player1_id]) map[row.player1_id] = row.player1_name;
        if (row.player2_id && row.player2_name && !map[row.player2_id]) map[row.player2_id] = row.player2_name;
      });
      // Own name from profile
      if (user) {
        const { data: p } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
        if (p?.full_name) map[user.id] = p.full_name;
      }
      setNameMap(map);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("leaderboard-ratings")
      .on("postgres_changes", { event: "*", schema: "public", table: "compete_ratings" }, () => { load(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const rows: Row[] = useMemo(() => {
    const since = rangeFilter === "all" ? 0 : Date.now() - Number(rangeFilter) * 24 * 60 * 60 * 1000;
    return ratings
      .filter(r => {
        if (examFilter !== "all" && r.target_exam !== examFilter) return false;
        if (since && new Date(r.updated_at).getTime() < since) return false;
        return true;
      })
      .sort((a, b) => b.rating - a.rating)
      .map((r, i) => {
        const matches = r.wins + r.losses + r.draws;
        const name = nameMap[r.user_id] || "Player";
        return {
          ...r,
          rank: i + 1,
          name,
          matches,
          accuracy: matches ? Math.round((r.wins / matches) * 100) : 0,
          initials: initialsOf(name),
          isYou: !!user && r.user_id === user.id,
        };
      });
  }, [ratings, examFilter, rangeFilter, nameMap, user?.id]);

  const topThree = rows.slice(0, 3);
  const rest = rows.slice(3, 50);
  const yourRow = rows.find(r => r.isYou);

  const podiumOrder = (rank: number) => (rank === 1 ? "order-2" : rank === 2 ? "order-1" : "order-3");
  const podiumColor = (rank: number) =>
    rank === 1 ? "from-accent to-primary" : rank === 2 ? "from-muted to-muted-foreground" : "from-primary-dark to-accent";

  return (
    <div className="pb-20 lg:pb-0">
      <div className="bg-gradient-to-br from-[hsl(var(--navy))] to-[hsl(var(--navy2))] grid-texture px-4 pt-4 pb-5">
        <h1 className="text-lg font-black font-display text-white flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" /> Leaderboard
        </h1>
        <p className="text-[11px] text-white/70 mt-1">Live rankings from Compete matches</p>
      </div>

      <div className="p-4 lg:p-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Filters
          </div>
          <Select value={examFilter} onValueChange={setExamFilter}>
            <SelectTrigger className="h-9 w-auto min-w-[140px] text-xs">
              <SelectValue placeholder="Exam" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All exams</SelectItem>
              {exams.map(e => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={rangeFilter} onValueChange={setRangeFilter}>
            <SelectTrigger className="h-9 w-auto min-w-[140px] text-xs">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Podium */}
        {loading ? (
          <Skeleton className="h-44 w-full" />
        ) : topThree.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card">
            <EmptyState title="No rankings yet" hint="Play Compete matches to appear on the leaderboard." />
          </div>
        ) : (
          <div className="flex items-end justify-center gap-4 py-6 animate-fade-in-up">
            {topThree.map((p) => (
              <div key={p.user_id} className={`text-center ${podiumOrder(p.rank)}`}>
                <div className="relative">
                  {p.rank === 1 && <Crown className="h-5 w-5 text-accent absolute -top-5 left-1/2 -translate-x-1/2" />}
                  <div className={`mx-auto rounded-full bg-gradient-to-br ${podiumColor(p.rank)} flex items-center justify-center border-2 ${p.rank === 1 ? "border-accent h-20 w-20" : "border-white/30 h-16 w-16"}`}>
                    <span className="text-lg font-bold text-white">{p.initials}</span>
                  </div>
                </div>
                <p className="text-xs font-bold text-foreground mt-2 max-w-[100px] truncate mx-auto">{p.name}</p>
                <p className="text-xs text-primary font-bold">{p.rating}</p>
                <div className={`mt-2 mx-auto rounded-t-lg ${p.rank === 1 ? "h-20 w-20 bg-accent/20" : p.rank === 2 ? "h-14 w-16 bg-muted" : "h-10 w-16 bg-primary-light"} flex items-center justify-center`}>
                  <span className="text-lg font-black font-display text-foreground">#{p.rank}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-5 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : rest.length === 0 ? (
              <EmptyState title="No more players" hint="Check back as more competitors join." />
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Rank", "Player", "Exam", "Rating", "Win Rate", "Matches"].map(h => (
                      <th key={h} className="p-3 text-left font-bold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rest.map(r => (
                    <tr key={r.user_id} className={`border-b border-border last:border-0 ${r.isYou ? "bg-primary-light" : "hover:bg-muted/20"}`}>
                      <td className="p-3 font-bold text-foreground">#{r.rank}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">{r.initials}</div>
                          <span className={`font-semibold ${r.isYou ? "text-primary" : "text-foreground"}`}>
                            {r.name} {r.isYou && <span className="text-[10px] text-primary">(You)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground capitalize">{r.target_exam}</td>
                      <td className="p-3 font-bold text-foreground">{r.rating}</td>
                      <td className="p-3 font-bold text-primary">{r.accuracy}%</td>
                      <td className="p-3 text-muted-foreground">{r.matches}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {yourRow && (
          <div className="sticky bottom-20 lg:bottom-4 bg-gradient-to-r from-primary to-accent rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
            <span className="text-xs font-bold text-primary-foreground">Your Position</span>
            <span className="text-sm font-black font-display text-primary-foreground">#{yourRow.rank} · {yourRow.rating}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
