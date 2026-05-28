import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/useAppStore";

type OrderRow = {
  id: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  items: { item_title: string; quantity: number; unit_price: number }[];
};

const statusColor = (s: string) => {
  switch (s) {
    case "paid":
    case "shipped":
      return "bg-blue-100 text-blue-700";
    case "delivered":
      return "bg-green-100 text-green-700";
    case "cancelled":
    case "failed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
};

const OrdersPage = () => {
  const { user } = useAppStore();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("orders")
        .select("id, status, total, currency, created_at, items:order_items(item_title, quantity, unit_price)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders((data ?? []) as unknown as OrderRow[]);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-3xl font-black">My Orders</h1>

      {loading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">No orders yet</p>
          <Link to="/e-store" className="mt-3 inline-block text-sm text-primary underline">
            Browse the E-Store
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Order #{o.id.slice(0, 8)}</p>
                  <p className="text-sm">{new Date(o.created_at).toLocaleString()}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${statusColor(o.status)}`}>
                  {o.status}
                </span>
              </div>
              <div className="mt-4 space-y-1 text-sm">
                {(o.items ?? []).map((it, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="truncate">
                      {it.item_title} <span className="text-muted-foreground">× {it.quantity}</span>
                    </span>
                    <span>₹{(Number(it.unit_price) * it.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between border-t border-border pt-3 text-sm font-black">
                <span>Total</span>
                <span>₹{Number(o.total).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
