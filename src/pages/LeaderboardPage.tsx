import { useCallback, useEffect, useMemo, useState } from "react";
import { Trophy, Crown, Inbox, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = {
  user_id: string;
  name: string;
  initials: string;
  attempts: number;
  totalScore: number;
  bestScore: number;
  rank: number;
  isYou: boolean;
};

const RANGE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "30", label: "Monthly" },
  { value: "7", label: "Weekly" },
];

const initialsOf = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("") || "?";

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
  const [rows, setRows] = useState<Row[]>([]);
  const [rangeFilter, setRangeFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    const since =
      rangeFilter === "all"
        ? null
        : new Date(Date.now() - Number(rangeFilter) * 24 * 60 * 60 * 1000).toISOString();

    let q = supabase
      .from("test_attempts")
      .select("user_id, score")
      .in("status", ["submitted", "auto_submitted"]);
    if (since) q = q.gte("submitted_at", since);
    const { data: attempts } = await q.limit(2000);

    const agg = new Map<string, { attempts: number; totalScore: number; bestScore: number }>();
    (attempts ?? []).forEach((a: any) => {
      const id = a.user_id as string;
      const cur = agg.get(id) ?? { attempts: 0, totalScore: 0, bestScore: 0 };
      cur.attempts += 1;
      cur.totalScore += Number(a.score ?? 0);
      cur.bestScore = Math.max(cur.bestScore, Number(a.score ?? 0));
      agg.set(id, cur);
    });

    const ids = Array.from(agg.keys());
    let nameMap: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      (profs ?? []).forEach((p: any) => {
        nameMap[p.user_id] = p.full_name ?? "Student";
      });
    }

    const sorted: Row[] = Array.from(agg.entries())
      .map(([uid, v]) => ({
        user_id: uid,
        name: nameMap[uid] ?? "Student",
        initials: initialsOf(nameMap[uid] ?? "Student"),
        ...v,
        rank: 0,
        isYou: !!user && uid === user.id,
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    setRows(sorted);
    setLoading(false);
  }, [rangeFilter, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const topThree = useMemo(() => rows.slice(0, 3), [rows]);
  const rest = useMemo(() => rows.slice(3, 50), [rows]);
  const yourRow = rows.find((r) => r.isYou);

  const podiumOrder = (rank: number) => (rank === 1 ? "order-2" : rank === 2 ? "order-1" : "order-3");
  const podiumColor = (rank: number) =>
    rank === 1 ? "from-accent to-primary" : rank === 2 ? "from-muted to-muted-foreground" : "from-primary-dark to-accent";

  return (
    <div className="pb-20 lg:pb-0">
      <div className="bg-primary-light px-4 pt-4 pb-5 rounded-b-2xl border-b border-border">
        <h1 className="text-lg font-black font-display text-foreground flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" /> Leaderboard
        </h1>
        <p className="text-[11px] text-muted-foreground mt-1">Top scorers across all tests</p>
      </div>

      <div className="p-4 lg:p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> Filters
          </div>
          <Select value={rangeFilter} onValueChange={setRangeFilter}>
            <SelectTrigger className="h-9 w-auto min-w-[140px] text-xs">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <Skeleton className="h-44 w-full" />
        ) : topThree.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card">
            <EmptyState title="No rankings yet" hint="Submit tests to appear on the leaderboard." />
          </div>
        ) : (
          <div className="flex items-end justify-center gap-4 py-6 animate-fade-in-up">
            {topThree.map((p) => (
              <div key={p.user_id} className={`text-center ${podiumOrder(p.rank)}`}>
                <div className="relative">
                  {p.rank === 1 && <Crown className="h-5 w-5 text-accent absolute -top-5 left-1/2 -translate-x-1/2" />}
                  <div
                    className={`mx-auto rounded-full bg-gradient-to-br ${podiumColor(p.rank)} flex items-center justify-center border-2 ${
                      p.rank === 1 ? "border-accent h-20 w-20" : "border-white/30 h-16 w-16"
                    }`}
                  >
                    <span className="text-lg font-bold text-white">{p.initials}</span>
                  </div>
                </div>
                <p className="text-xs font-bold text-foreground mt-2 max-w-[100px] truncate mx-auto">{p.name}</p>
                <p className="text-xs text-primary font-bold">{Math.round(p.totalScore)} pts</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-5 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : rest.length === 0 ? (
              <EmptyState title="No more players" />
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Rank", "Player", "Attempts", "Best", "Total"].map((h) => (
                      <th key={h} className="p-3 text-left font-bold text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rest.map((r) => (
                    <tr
                      key={r.user_id}
                      className={`border-b border-border last:border-0 ${
                        r.isYou ? "bg-primary-light" : "hover:bg-muted/20"
                      }`}
                    >
                      <td className="p-3 font-bold text-foreground">#{r.rank}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {r.initials}
                          </div>
                          <span className={`font-semibold ${r.isYou ? "text-primary" : "text-foreground"}`}>
                            {r.name} {r.isYou && <span className="text-[10px] text-primary">(You)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{r.attempts}</td>
                      <td className="p-3 font-bold text-foreground">{Math.round(r.bestScore)}</td>
                      <td className="p-3 font-bold text-primary">{Math.round(r.totalScore)}</td>
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
            <span className="text-sm font-black font-display text-primary-foreground">
              #{yourRow.rank} · {Math.round(yourRow.totalScore)} pts
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
