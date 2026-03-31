import { IndianRupee, TrendingUp, ArrowDownLeft, Clock, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState } from "react";

const stats = [
  { label: "Total Revenue", value: "₹48.2L", icon: IndianRupee, color: "text-secondary" },
  { label: "Today", value: "₹1.2L", icon: TrendingUp, color: "text-primary" },
  { label: "Refunds", value: "₹12K", icon: ArrowDownLeft, color: "text-destructive" },
  { label: "Pending", value: "₹8K", icon: Clock, color: "text-accent" },
];

const monthlyRevenue = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"].map((m) => ({
  month: m, revenue: Math.floor(Math.random() * 300000 + 300000),
}));

const transactions = [
  { id: "TXN-001234", student: "Arjun Mehta", plan: "Pro Monthly", amount: "₹999", currency: "INR", gateway: "Razorpay", date: "2026-03-30", status: "success" },
  { id: "TXN-001233", student: "Priya Sharma", plan: "Elite Annual", amount: "₹7,999", currency: "INR", gateway: "Razorpay", date: "2026-03-30", status: "success" },
  { id: "TXN-001232", student: "Sneha Gupta", plan: "Pro Monthly", amount: "AED 149", currency: "AED", gateway: "Stripe", date: "2026-03-29", status: "success" },
  { id: "TXN-001231", student: "Amit Patel", plan: "Pro Monthly", amount: "₹999", currency: "INR", gateway: "Razorpay", date: "2026-03-29", status: "failed" },
  { id: "TXN-001230", student: "Rahul Singh", plan: "Course Only", amount: "₹1,999", currency: "INR", gateway: "Razorpay", date: "2026-03-28", status: "refunded" },
  { id: "TXN-001229", student: "Vikram Joshi", plan: "Pro Monthly", amount: "₹999", currency: "INR", gateway: "Razorpay", date: "2026-03-28", status: "success" },
];

const statusBadge = (s: string) => {
  const styles: Record<string, string> = { success: "bg-secondary/10 text-secondary", pending: "bg-accent/20 text-accent", failed: "bg-destructive/10 text-destructive", refunded: "bg-muted text-muted-foreground" };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${styles[s]}`}>{s}</span>;
};

const subPlans = [
  { plan: "Free", count: 8432, revenue: "₹0" },
  { plan: "Pro", count: 3241, revenue: "₹32.4L" },
  { plan: "Elite", count: 1174, revenue: "₹15.8L" },
];

const AdminPaymentsPage = () => {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? transactions : transactions.filter(t => t.status === filter);

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <s.icon className={`h-5 w-5 ${s.color}`} />
            <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly Revenue Chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold text-foreground mb-4">Monthly Revenue</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyRevenue}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(215,16%,47%)" />
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(215,16%,47%)" tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`} />
            <Tooltip formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']} />
            <Bar dataKey="revenue" fill="hsl(24,95%,53%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Transactions */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-bold text-foreground">Transactions</h2>
          <div className="flex gap-2">
            {["all", "success", "failed", "refunded"].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-[10px] font-medium capitalize ${filter === f ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground"}`}>{f}</button>
            ))}
            <button className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-[10px] font-medium text-muted-foreground"><Download className="h-3 w-3" /> CSV</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border text-muted-foreground"><th className="text-left py-2 font-medium">ID</th><th className="text-left py-2 font-medium">Student</th><th className="text-left py-2 font-medium hidden sm:table-cell">Plan</th><th className="text-right py-2 font-medium">Amount</th><th className="text-left py-2 font-medium hidden md:table-cell">Gateway</th><th className="text-left py-2 font-medium hidden lg:table-cell">Date</th><th className="text-left py-2 font-medium">Status</th></tr></thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 font-mono text-muted-foreground">{t.id}</td>
                  <td className="py-2.5 font-medium text-foreground">{t.student}</td>
                  <td className="py-2.5 text-muted-foreground hidden sm:table-cell">{t.plan}</td>
                  <td className="py-2.5 text-right font-medium text-foreground">{t.amount}</td>
                  <td className="py-2.5 text-muted-foreground hidden md:table-cell">{t.gateway}</td>
                  <td className="py-2.5 text-muted-foreground hidden lg:table-cell">{t.date}</td>
                  <td className="py-2.5">{statusBadge(t.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subscription Overview */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold text-foreground mb-3">Subscription Overview</h2>
        <div className="grid grid-cols-3 gap-3">
          {subPlans.map((p) => (
            <div key={p.plan} className="rounded-lg border border-border p-3 text-center">
              <p className="text-lg font-bold text-foreground">{p.count.toLocaleString()}</p>
              <p className="text-xs font-medium text-muted-foreground">{p.plan} users</p>
              <p className="text-xs font-semibold text-secondary mt-1">{p.revenue}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPaymentsPage;
