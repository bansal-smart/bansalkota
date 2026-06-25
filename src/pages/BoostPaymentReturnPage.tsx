import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "paid" | "failed" | "pending" | "error";

const BoostPaymentReturnPage = () => {
  const [params] = useSearchParams();
  const regId = params.get("reg_id");
  const [status, setStatus] = useState<Status>("loading");
  const [admit, setAdmit] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    async function poll() {
      if (!regId) {
        setStatus("error");
        setMessage("Missing registration id");
        return;
      }
      attempts += 1;
      const { data, error } = await supabase.functions.invoke("cashfree-boost-verify", {
        body: { registration_id: regId },
      });
      if (cancelled) return;
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      if (data?.admit_card_number) setAdmit(data.admit_card_number);
      const s = data?.status as Status;
      if (s === "paid") {
        setStatus("paid");
        return;
      }
      if (s === "failed") {
        setStatus("failed");
        return;
      }
      if (attempts < 6) {
        setStatus("pending");
        setTimeout(poll, 2500);
      } else {
        setStatus("pending");
      }
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [regId]);

  const icon = {
    loading: <Loader2 className="h-12 w-12 animate-spin text-primary" />,
    paid: <CheckCircle2 className="h-14 w-14 text-green-600" />,
    failed: <XCircle className="h-14 w-14 text-destructive" />,
    pending: <Clock className="h-14 w-14 text-amber-500" />,
    error: <XCircle className="h-14 w-14 text-destructive" />,
  }[status];

  const heading = {
    loading: "Verifying payment…",
    paid: "Registration confirmed",
    failed: "Payment failed",
    pending: "Payment processing",
    error: "Verification error",
  }[status];

  const body = {
    loading: "Hang on while we confirm your BOOST 2026 payment.",
    paid: "Your seat is booked. Save your admit card number — you'll need it on exam day.",
    failed: "We couldn't process the payment. No worries — your registration is saved. You can retry payment or our team will reach out.",
    pending: "Cashfree is still confirming. We'll mark your seat confirmed as soon as it clears. You'll also get a WhatsApp update.",
    error: message || "Something went wrong while verifying. Contact support with your admit card number.",
  }[status];

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex justify-center">{icon}</div>
        <h1 className="mt-4 font-display text-2xl font-black">{heading}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        {admit && (
          <div className="mt-5 inline-block rounded-xl bg-bansal-cream border-2 border-bansal-orange px-6 py-3">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase">Admit card</div>
            <div className="font-mono text-xl font-bold text-bansal-blue mt-1">{admit}</div>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <Link to="/boost" className="rounded-xl bg-[hsl(var(--bansal-orange))] py-2.5 font-bold text-white">
            Back to BOOST
          </Link>
          <Link to="/" className="text-xs text-muted-foreground underline">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BoostPaymentReturnPage;
