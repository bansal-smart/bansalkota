import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import { trackPurchaseOnce } from "@/lib/metaPixel";

const BoostPaymentReturnPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const regId = params.get("reg_id");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    async function poll() {
      if (!regId) {
        navigate("/thank-you", {
          replace: true,
          state: { type: "boost", status: "error", message: "Missing registration id" },
        });
        return;
      }
      attempts += 1;
      const { data, error } = await supabase.functions.invoke("cashfree-boost-verify", {
        body: { registration_id: regId },
      });
      if (cancelled) return;
      if (error) {
        navigate("/thank-you", {
          replace: true,
          state: { type: "boost", status: "error", message: error.message },
        });
        return;
      }
      const admitCardNumber = data?.admit_card_number as string | undefined;
      const amount = data?.amount != null ? Number(data.amount) : undefined;
      const s = data?.status as "paid" | "failed" | "pending";

      if (s === "paid") {
        if (amount != null) {
          trackPurchaseOnce(`boost:${regId}`, amount);
        }
        navigate("/thank-you", {
          replace: true,
          state: { type: "boost", status: "paid", admitCardNumber, amount },
        });
        return;
      }
      if (s === "failed") {
        navigate("/thank-you", {
          replace: true,
          state: { type: "boost", status: "failed", admitCardNumber },
        });
        return;
      }
      if (attempts < 6) {
        setTimeout(poll, 2500);
      } else {
        navigate("/thank-you", {
          replace: true,
          state: { type: "boost", status: "pending", admitCardNumber },
        });
      }
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [regId, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <Seo title="BOOST Registration Status" raw description="Bansal Classes BOOST registration status." noindex />
      <div className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
        <h1 className="mt-4 font-display text-2xl font-black">Verifying payment…</h1>
        <p className="mt-2 text-sm text-muted-foreground">Hang on while we confirm your BOOST 2026 payment.</p>
      </div>
    </div>
  );
};

export default BoostPaymentReturnPage;
