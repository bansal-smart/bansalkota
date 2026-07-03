import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, Loader2, Search, Download, X as XIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { toast } from "sonner";

type Order = {
  id: string;
  user_id: string;
  status: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  currency: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_pincode: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  notes: string | null;
  created_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  item_type: string;
  item_title: string;
  unit_price: number;
  quantity: number;
};

const STATUSES = ["all", "pending", "paid", "shipped", "delivered", "cancelled", "refunded"] as const;

const AdminOrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const debouncedQ = useDebouncedValue(q, 300);
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>("all");
  const [selected, setSelected] = useState<Order | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    else setOrders((data ?? []) as Order[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const loadItems = async (orderId: string) => {
    if (items[orderId]) return;
    const { data } = await supabase.from("order_items").select("*").eq("order_id", orderId);
    setItems((m) => ({ ...m, [orderId]: (data ?? []) as OrderItem[] }));
  };

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        o.id.includes(needle) ||
        (o.shipping_name ?? "").toLowerCase().includes(needle) ||
        (o.shipping_phone ?? "").includes(needle) ||
        (o.shipping_city ?? "").toLowerCase().includes(needle) ||
        (o.razorpay_payment_id ?? "").toLowerCase().includes(needle)
      );
    });
  }, [orders, debouncedQ, statusFilter]);

  const stats = useMemo(() => {
    const total = orders.length;
    const paid = orders.filter((o) => ["paid", "shipped", "delivered"].includes(o.status)).length;
    const pending = orders.filter((o) => o.status === "pending").length;
    const revenue = orders
      .filter((o) => ["paid", "shipped", "delivered"].includes(o.status))
      .reduce((s, o) => s + Number(o.total || 0), 0);
    return { total, paid, pending, revenue };
  }, [orders]);

  const update = async (id: string, patch: Partial<Order>) => {
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Order updated");
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    if (selected?.id === id) setSelected({ ...selected, ...patch } as Order);
  };

  const exportCsv = () => {
    const headers = ["id","status","shipping_name","shipping_phone","shipping_city","shipping_state","subtotal","shipping_fee","total","currency","razorpay_payment_id","created_at"];
    const csv = [headers.join(",")]
      .concat(filtered.map((o) => headers.map((h) => `"${String((o as any)[h] ?? "").replace(/"/g, '""')}"`).join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openDetail = (o: Order) => {
    setSelected(o);
    loadItems(o.id);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-bansal-orange" /> E-Store Orders
          </h1>
          <p className="text-sm text-muted-foreground">Track payments, shipping, and customer orders</p>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total orders", value: stats.total },
          { label: "Paid", value: stats.paid },
          { label: "Pending", value: stats.pending },
          { label: "Revenue", value: `₹${stats.revenue.toLocaleString("en-IN")}` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order ID, customer, payment ref…"
            className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => <option key={s} value={s}>Status: {s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase">
              <tr>
                <th className="text-left p-3">Order</th>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">City</th>
                <th className="text-right p-3">Total</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} onClick={() => openDetail(o)} className="border-t border-border hover:bg-muted/40 cursor-pointer">
                  <td className="p-3 font-mono text-xs">{o.id.slice(0, 8)}…</td>
                  <td className="p-3 font-semibold">{o.shipping_name ?? "—"}<br /><span className="text-xs text-muted-foreground">{o.shipping_phone}</span></td>
                  <td className="p-3">{o.shipping_city ?? "—"}</td>
                  <td className="p-3 text-right font-bold">₹{Number(o.total).toLocaleString("en-IN")}</td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      o.status === "delivered" ? "bg-green-100 text-green-700"
                      : o.status === "shipped" ? "bg-blue-100 text-blue-700"
                      : o.status === "paid" ? "bg-emerald-100 text-emerald-700"
                      : o.status === "cancelled" || o.status === "refunded" ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                    }`}>{o.status}</span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No orders match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md bg-card shadow-2xl overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-card">
              <h2 className="font-bold">Order #{selected.id.slice(0, 8)}</h2>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-muted rounded"><XIcon className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4 text-sm">
              <div>
                <div className="text-[11px] uppercase text-muted-foreground font-semibold mb-1">Items</div>
                <div className="space-y-2">
                  {(items[selected.id] ?? []).map((it) => (
                    <div key={it.id} className="flex justify-between border-b border-border pb-2">
                      <div>
                        <div className="font-semibold">{it.item_title}</div>
                        <div className="text-xs text-muted-foreground">{it.item_type} · qty {it.quantity}</div>
                      </div>
                      <div className="font-bold">₹{(Number(it.unit_price) * it.quantity).toLocaleString("en-IN")}</div>
                    </div>
                  ))}
                  {!items[selected.id]?.length && <div className="text-xs text-muted-foreground">Loading items…</div>}
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-xs">
                <div className="flex justify-between"><span>Subtotal</span><span>₹{Number(selected.subtotal).toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span>₹{Number(selected.shipping_fee).toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-border"><span>Total</span><span>₹{Number(selected.total).toLocaleString("en-IN")}</span></div>
              </div>

              <div>
                <div className="text-[11px] uppercase text-muted-foreground font-semibold mb-1">Shipping address</div>
                <div>{selected.shipping_name}</div>
                <div>{selected.shipping_phone}</div>
                <div className="text-xs">{selected.shipping_address}<br />{selected.shipping_city}, {selected.shipping_state} {selected.shipping_pincode}</div>
              </div>

              {selected.razorpay_payment_id && (
                <div>
                  <div className="text-[11px] uppercase text-muted-foreground font-semibold">Payment</div>
                  <div className="font-mono text-xs">{selected.razorpay_payment_id}</div>
                </div>
              )}

              <div className="pt-3 border-t border-border">
                <label className="text-xs font-semibold text-muted-foreground">Order status</label>
                <select
                  value={selected.status}
                  onChange={(e) => update(selected.id, { status: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm mt-1"
                >
                  {STATUSES.filter((s) => s !== "all").map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
