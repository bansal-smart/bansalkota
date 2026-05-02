import { IndianRupee, TrendingUp, ArrowDownLeft, Clock, Download, Loader2, CreditCard } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Payment = {
  id: string;
  user_id: string | null;
  student_name: string | null;
  plan: string | null;
  amount: number;
  currency: string;
  gateway: string;
  external_id: string | null;
  status: string;
  refunded_at: string | null;
  created_at: string;
};

const fmtCurrency = (amount: number, currency: string) => {
  if (currency === "INR") return `₹${amount.toLocaleString("en-IN")}`;
  if (currency === "AED") return `AED ${amount.toLocaleString()}`;
  return `${currency} ${amount.toLocaleString()}`;
};

const statusBadge = (s: string) => {
  const styles: Record<string, string> = {
    success: "bg-secondary/10 text-secondary",
    pending: "bg-accent/20 text-accent",
    failed: "bg-destructive/10 text-destructive",
    refunded: "bg-muted text-muted-foreground",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${styles[s] ?? "bg-muted text-muted-foreground"}`}>{s}</span>;
};

const exportCsv = (rows: Payment[]) => {
  const header = ["id", "external_id", "student", "plan", "amount", "currency", "gateway", "status", "date"];
  const lines = [header.join(",")].concat(
    rows.map((r) =>
      [r.id, r.external_id ?? "", r.student_name ?? "", r.plan ?? "", r.amount, r.currency, r.gateway, r.status, r.created_at]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    ),
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const AdminPaymentsPage = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) toast.error(error.message);
      setPayments((data as Payment[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const successful = payments.filter((p) => p.status === "success");
    const totalRevenue = successful.reduce((acc, p) => acc + Number(p.amount), 0);
    const todayRevenue = successful
      .filter((p) => p.created_at.startsWith(today))
      .reduce((acc, p) => acc + Number(p.amount), 0);
    const refunds = payments
      .filter((p) => p.status === "refunded")
      .reduce((acc, p) => acc + Number(p.amount), 0);
    const pending = payments
      .filter((p) => p.status === "pending")
      .reduce((acc, p) => acc + Number(p.amount), 0);
    return { totalRevenue, todayRevenue, refunds, pending };
  }, [payments]);

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    payments
      .filter((p) => p.status === "success")
      .forEach((p) => {
        const m = format(new Date(p.created_at), "MMM yy");
        map.set(m, (map.get(m) ?? 0) + Number(p.amount));
      });
    return Array.from(map.entries()).map(([month, revenue]) => ({ month, revenue }));
  }, [payments]);

  const filtered = filter === "all" ? payments : payments.filter((t) => t.status === filter);

  const stats_cards = [
    { label: "Total Revenue", value: fmtCurrency(stats.totalRevenue, "INR"), icon: IndianRupee, color: "text-secondary" },
    { label: "Today", value: fmtCurrency(stats.todayRevenue, "INR"), icon: TrendingUp, color: "text-primary" },
    { label: "Refunds", value: fmtCurrency(stats.refunds, "INR"), icon: ArrowDownLeft, color: "text-destructive" },
    { label: "Pending", value: fmtCurrency(stats.pending, "INR"), icon: Clock, color: "text-accent" },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
        {stats_cards.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 hover-lift">
            <s.icon className={`h-5 w-5 ${s.color}`} />
            <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 animate-fade-in-up">
        <h2 className="text-sm font-bold text-foreground mb-4">Monthly Revenue</h2>
        {monthly.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No revenue data yet — once payment gateways are connected, monthly trends will appear here.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215,16%,47%)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(215,16%,47%)" tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, "Revenue"]} />
              <Bar dataKey="revenue" fill="hsl(24,95%,53%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 animate-fade-in-up">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-bold text-foreground">Transactions</h2>
          <div className="flex gap-2">
            {["all", "success", "failed", "refunded", "pending"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-[10px] font-medium capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground"}`}
              >
                {f}
              </button>
            ))}
            <button
              onClick={() => exportCsv(filtered)}
              disabled={filtered.length === 0}
              className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[10px] font-medium text-muted-foreground disabled:opacity-50"
            >
              <Download className="h-3 w-3" /> CSV
            </button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CreditCard className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground">
              Once Razorpay (India) or Stripe (Dubai) payments are wired in, every successful, failed or refunded charge will land here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 font-medium">ID</th>
                  <th className="text-left py-2 font-medium">Student</th>
                  <th className="text-left py-2 font-medium hidden sm:table-cell">Plan</th>
                  <th className="text-right py-2 font-medium">Amount</th>
                  <th className="text-left py-2 font-medium hidden md:table-cell">Gateway</th>
                  <th className="text-left py-2 font-medium hidden lg:table-cell">Date</th>
                  <th className="text-left py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-mono text-muted-foreground">{t.external_id ?? t.id.slice(0, 8)}</td>
                    <td className="py-2.5 font-medium text-foreground">{t.student_name ?? "—"}</td>
                    <td className="py-2.5 text-muted-foreground hidden sm:table-cell">{t.plan ?? "—"}</td>
                    <td className="py-2.5 text-right font-medium text-foreground">{fmtCurrency(Number(t.amount), t.currency)}</td>
                    <td className="py-2.5 text-muted-foreground hidden md:table-cell capitalize">{t.gateway}</td>
                    <td className="py-2.5 text-muted-foreground hidden lg:table-cell">{format(new Date(t.created_at), "dd MMM yy")}</td>
                    <td className="py-2.5">{statusBadge(t.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPaymentsPage;
