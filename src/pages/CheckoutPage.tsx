import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CheckoutPage = () => {
  const { cart, user, clearCart } = useAppStore();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [form, setForm] = useState({
    name: user?.full_name ?? "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const subtotal = cart.reduce((s, c) => s + Number(c.price) * c.quantity, 0);
  const shippingFee = subtotal >= 500 || subtotal === 0 ? 0 : 60;
  const total = subtotal + shippingFee;

  const placeOrder = async () => {
    if (!user) {
      toast.error("Please sign in to checkout");
      navigate("/login");
      return;
    }
    if (cart.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (!form.name || !form.phone || !form.address || !form.city || !form.state || !form.pincode) {
      toast.error("Please fill all shipping details");
      return;
    }

    setPlacing(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        status: "pending",
        subtotal,
        shipping_fee: shippingFee,
        total,
        currency: "INR",
        shipping_name: form.name,
        shipping_phone: form.phone,
        shipping_address: form.address,
        shipping_city: form.city,
        shipping_state: form.state,
        shipping_pincode: form.pincode,
      })
      .select("id")
      .single();

    if (error || !order) {
      setPlacing(false);
      toast.error(error?.message ?? "Could not place order");
      return;
    }

    const items = cart.map((c) => ({
      order_id: order.id,
      item_type: c.type,
      item_id: c.id,
      item_title: c.title,
      unit_price: c.price,
      quantity: c.quantity,
    }));
    const { error: itemsErr } = await supabase.from("order_items").insert(items);

    setPlacing(false);

    if (itemsErr) {
      toast.error("Order saved but items failed: " + itemsErr.message);
      return;
    }

    clearCart();
    toast.success("Order placed! Our team will contact you to confirm payment & delivery.");
    navigate("/orders");
  };

  return (
    <div className="bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <Link to="/e-store" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Continue shopping
        </Link>
        <h1 className="mt-4 font-display text-3xl font-black">Checkout</h1>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-4 font-bold">Shipping address</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Phone (10-digit)"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <input
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm sm:col-span-2"
                  placeholder="Address (house, street, area)"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
                <input
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="City"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
                <input
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="State"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
                <input
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Pincode"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 font-bold">Items ({cart.length})</h2>
              <div className="space-y-2">
                {cart.map((c) => (
                  <div key={`${c.type}-${c.id}`} className="flex items-center justify-between text-sm">
                    <span className="truncate">
                      {c.title} <span className="text-muted-foreground">× {c.quantity}</span>
                    </span>
                    <span className="font-semibold">₹{(Number(c.price) * c.quantity).toLocaleString()}</span>
                  </div>
                ))}
                {cart.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Cart is empty.{" "}
                    <Link to="/e-store" className="text-primary underline">
                      Browse the store
                    </Link>
                    .
                  </p>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="mb-3 font-bold">Order summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shippingFee === 0 ? "Free" : `₹${shippingFee}`}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-black">
                  <span>Total</span>
                  <span>₹{total.toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={placeOrder}
                disabled={placing || cart.length === 0}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--bansal-orange))] py-3 font-bold text-white hover:bg-[hsl(var(--bansal-orange))]/90 disabled:opacity-50"
              >
                {placing && <Loader2 className="h-4 w-4 animate-spin" />}
                Place Order
              </button>
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" /> Payment via Razorpay activates once test keys are connected.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
