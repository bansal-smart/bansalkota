import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/useAppStore";

type Status = "loading" | "paid" | "failed" | "pending" | "cancelled" | "error";

const PaymentReturnPage = () => {
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("");
  const { clearCart } = useAppStore();

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      if (!orderId) { setStatus("error"); setMessage("Missing order id"); return; }
      const { data, error } = await supabase.functions.invoke("cashfree-verify-order", {
        body: { order_id: orderId },
      });
      if (cancelled) return;
      if (error || data?.error) {
        setStatus("error");
        setMessage(error?.message || data?.error || "Could not verify payment");
        return;
      }
      setStatus(data.status as Status);
      if (data.status === "paid") clearCart();
    }
    verify();
    return () => { cancelled = true; };
  }, [orderId, clearCart]);

  const icon = {
    loading: <Loader2 className="h-12 w-12 animate-spin text-primary" />,
    paid: <CheckCircle2 className="h-14 w-14 text-green-600" />,
    failed: <XCircle className="h-14 w-14 text-destructive" />,
    cancelled: <XCircle className="h-14 w-14 text-muted-foreground" />,
    pending: <Clock className="h-14 w-14 text-amber-500" />,
    error: <XCircle className="h-14 w-14 text-destructive" />,
  }[status];

  const heading = {
    loading: "Verifying payment…",
    paid: "Payment successful",
    failed: "Payment failed",
    cancelled: "Payment cancelled",
    pending: "Payment pending",
    error: "Verification error",
  }[status];

  const body = {
    loading: "Hang on while we confirm your payment with Cashfree.",
    paid: "Your order is confirmed. Course and test-series access has been activated.",
    failed: "We could not process your payment. No money was charged, or it will be auto-refunded.",
    cancelled: "You cancelled the payment. You can try again any time.",
    pending: "Cashfree is still confirming. We'll mark your order paid as soon as it clears.",
    error: message || "Something went wrong.",
  }[status];

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex justify-center">{icon}</div>
        <h1 className="mt-4 font-display text-2xl font-black">{heading}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link to="/orders" className="rounded-xl bg-[hsl(var(--bansal-orange))] py-2.5 font-bold text-white">
            View My Orders
          </Link>
          <Link to="/my-courses" className="rounded-xl border border-border py-2.5 font-semibold">
            Go to My Courses
          </Link>
          <Link to="/" className="text-xs text-muted-foreground underline">Back to home</Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentReturnPage;
