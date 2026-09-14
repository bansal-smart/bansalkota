import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  Award, ArrowRight, Clock, Check, X, Loader2, TrendingUp,
  IndianRupee, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type BoostRow = {
  id: string;
  admit_card_number: string | null;
  full_name: string;
  email: string;
  class_level: string;
  target_exam: string;
  city: string | null;
  state: string | null;
  payment_status: "pending" | "paid" | "failed";
  status: "registered" | "confirmed" | "attended" | "cancelled";
  amount: number;
  created_at: string;
};

const payTone: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  failed: "bg-rose-100 text-rose-700 border-rose-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
};

const statusTone: Record<string, string> = {
  registered: "bg-bansal-blue/10 text-bansal-blue border-bansal-blue/20",
  confirmed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  attended: "bg-bansal-orange/10 text-bansal-orange border-bansal-orange/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const StaffDashboardPage = () => {
  const [rows, setRows] = useState<BoostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, last7: 0, pendingPay: 0, paid: 0, failed: 0, revenue: 0 });

  useEffect(() => {
    (async () => {
      const last7Start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [recentRes, totalRes, last7Res, pendingRes, paidRes, failedRes] = await Promise.all([
        supabase
          .from("boost_registrations")
          .select("id,admit_card_number,full_name,email,class_level,target_exam,city,state,payment_status,status,amount,created_at")
          .order("created_at", { ascending: false })
          .limit(6),
        supabase.from("boost_registrations").select("id", { count: "exact", head: true }),
        supabase.from("boost_registrations").select("id", { count: "exact", head: true }).gte("created_at", last7Start),
        supabase.from("boost_registrations").select("id", { count: "exact", head: true }).eq("payment_status", "pending"),
        supabase.from("boost_registrations").select("id", { count: "exact", head: true }).eq("payment_status", "paid"),
        supabase.from("boost_registrations").select("id", { count: "exact", head: true }).eq("payment_status", "failed"),
      ]);
      if (recentRes.error) console.error(recentRes.error);
      setRows((recentRes.data ?? []) as BoostRow[]);

      let revenue = 0;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("boost_registrations")
          .select("amount")
          .eq("payment_status", "paid")
          .range(from, from + 999);
        if (error) {
          console.error(error);
          break;
        }
        revenue += (data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
        if (!data || data.length < 1000) break;
        from += 1000;
      }

      setStats({
        total: totalRes.count ?? 0,
        last7: last7Res.count ?? 0,
        pendingPay: pendingRes.count ?? 0,
        paid: paidRes.count ?? 0,
        failed: failedRes.count ?? 0,
        revenue,
      });
      setLoading(false);
    })();
  }, []);

  const recent = rows.slice(0, 6);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black font-display text-foreground flex items-center gap-2">
          <Award className="h-6 w-6 text-bansal-orange" /> BOOST Registrations Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of BOOST exam registrations across centres and cities.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total Registrations", value: stats.total, color: "text-foreground", icon: Award },
          { label: "Last 7 days", value: stats.last7, color: "text-bansal-orange", icon: TrendingUp },
          { label: "Pending Payment", value: stats.pendingPay, color: "text-amber-600", icon: Clock },
          { label: "Paid", value: stats.paid, color: "text-emerald-600", icon: Check },
          { label: "Failed", value: stats.failed, color: "text-rose-600", icon: X },
          { label: "Revenue (Paid)", value: `₹${stats.revenue.toLocaleString()}`, color: "text-bansal-blue", icon: IndianRupee },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className={`mt-1 text-2xl font-black font-display ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent BOOST registrations */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-base font-bold text-foreground">Recent BOOST Registrations</h2>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/boost">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : recent.length === 0 ? (
          <div className="p-12 text-center">
            <Award className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 font-semibold text-foreground">No BOOST registrations yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Registrations from the BOOST landing page will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((r) => {
              const payClass = payTone[r.payment_status] ?? payTone.pending;
              const meta = [r.class_level, r.target_exam, r.city].filter(Boolean).join(" · ");
              return (
                <li key={r.id} className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-bansal-orange to-amber-500 text-white font-display font-extrabold text-sm grid place-items-center shrink-0">
                    {r.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground truncate">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.admit_card_number ?? "—"}{meta ? ` · ${meta}` : ""}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <Badge variant="outline" className={payClass}>
                      {r.payment_status}
                    </Badge>
                    {r.status !== "registered" && (
                      <Badge variant="outline" className={statusTone[r.status] ?? ""}>
                        {r.status}
                      </Badge>
                    )}
                  </div>
                  <div className="hidden md:block text-xs text-muted-foreground w-28 text-right shrink-0">
                    {format(new Date(r.created_at), "dd MMM, HH:mm")}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Quick alert card */}
      {stats.failed > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-800">{stats.failed} payment(s) failed</p>
            <p className="text-xs text-rose-700 mt-0.5">
              Review failed BOOST payments in the <Link to="/admin/boost" className="underline font-semibold">BOOST Registrations</Link> tab.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboardPage;
