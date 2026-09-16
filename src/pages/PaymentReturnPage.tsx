import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import Seo from "@/components/Seo";
import { trackPurchaseOnce } from "@/lib/metaPixel";

const ITEM_TYPE_TO_THANK_YOU_TYPE: Record<string, "e_store" | "course" | "test_series"> = {
  book: "e_store",
  pack: "e_store",
  course: "course",
  test_series: "test_series",
};

const PaymentReturnPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderId = params.get("order_id");
  const { clearCart } = useAppStore();

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      if (!orderId) {
        navigate("/thank-you", {
          replace: true,
          state: { type: "e_store", status: "error", message: "Missing order id" },
        });
        return;
      }
      const { data, error } = await supabase.functions.invoke("cashfree-verify-order", {
        body: { order_id: orderId },
      });
      if (cancelled) return;
      if (error || data?.error) {
        navigate("/thank-you", {
          replace: true,
          state: {
            type: "e_store",
            status: "error",
            message: error?.message || data?.error || "Could not verify payment",
          },
        });
        return;
      }

      const status = data.status as "paid" | "failed" | "pending" | "cancelled";

      let type: "e_store" | "course" | "test_series" = "e_store";
      let title: string | undefined;
      const { data: items } = await supabase
        .from("order_items")
        .select("item_type, item_title")
        .eq("order_id", orderId);
      if (cancelled) return;
      if (items && items.length > 0) {
        type = ITEM_TYPE_TO_THANK_YOU_TYPE[items[0].item_type] ?? "e_store";
        title = items.length === 1 ? items[0].item_title : undefined;
      }

      const amount = data.order?.total != null ? Number(data.order.total) : undefined;

      if (status === "paid") {
        clearCart();
        if (amount != null) {
          trackPurchaseOnce(`order:${orderId}`, amount);
        }
      }

      navigate(`/thank-you?type=${type}`, {
        replace: true,
        state: { type, status, title, amount },
      });
    }
    verify();
    return () => {
      cancelled = true;
    };
  }, [orderId, clearCart, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <Seo title="Payment Status" raw description="Bansal Classes payment status." noindex />
      <div className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-black">Verifying payment…</h1>
        <p className="mt-2 text-sm text-muted-foreground">Hang on while we confirm your payment with Cashfree.</p>
      </div>
    </div>
  );
};

export default PaymentReturnPage;
