import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, XCircle, Clock, PartyPopper } from "lucide-react";
import Seo from "@/components/Seo";

type ThankYouState = {
  type: "e_store" | "course" | "test_series" | "boost";
  status: "paid" | "free" | "failed" | "cancelled" | "pending" | "error";
  title?: string;
  amount?: number;
  admitCardNumber?: string;
  message?: string;
};

const ThankYouPage = () => {
  const location = useLocation();
  const state = (location.state as ThankYouState | null) ?? null;

  // Direct visit, refresh, or a bookmarked/shared link carries no router
  // state — never fabricate a success screen in that case.
  if (!state) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <Seo title="Thank You" raw description="Bansal Classes confirmation." noindex />
        <div className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="font-display text-2xl font-black">Looking for a confirmation?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn't find details for this page directly. Check your orders or courses instead.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/orders" className="rounded-xl bg-[hsl(var(--bansal-orange))] py-2.5 font-bold text-white">
              View My Orders
            </Link>
            <Link to="/my-courses" className="rounded-xl border border-border py-2.5 font-semibold">
              Go to My Courses
            </Link>
            <Link to="/" className="text-xs text-muted-foreground underline">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isBoost = state.type === "boost";

  const icon = {
    paid: <CheckCircle2 className="h-14 w-14 text-green-600" />,
    free: <PartyPopper className="h-14 w-14 text-green-600" />,
    failed: <XCircle className="h-14 w-14 text-destructive" />,
    cancelled: <XCircle className="h-14 w-14 text-muted-foreground" />,
    pending: <Clock className="h-14 w-14 text-amber-500" />,
    error: <XCircle className="h-14 w-14 text-destructive" />,
  }[state.status];

  const heading = isBoost
    ? {
        paid: "Registration confirmed",
        free: "Registration confirmed",
        failed: "Payment failed",
        cancelled: "Payment cancelled",
        pending: "Payment processing",
        error: "Verification error",
      }[state.status]
    : {
        paid: "Payment successful",
        free: "You're enrolled!",
        failed: "Payment failed",
        cancelled: "Payment cancelled",
        pending: "Payment pending",
        error: "Verification error",
      }[state.status];

  const body = isBoost
    ? {
        paid: "Your seat is booked. Save your admit card number — you'll need it on exam day.",
        free: "Your seat is booked. Save your admit card number — you'll need it on exam day.",
        failed:
          "We couldn't process the payment. No worries — your registration is saved. You can retry payment or our team will reach out.",
        cancelled: "You cancelled the payment. You can try again any time.",
        pending:
          "Cashfree is still confirming. We'll mark your seat confirmed as soon as it clears. You'll also get a WhatsApp update.",
        error: state.message || "Something went wrong while verifying. Contact support with your admit card number.",
      }[state.status]
    : {
        paid: state.title
          ? `Your payment for ${state.title} is confirmed. Access has been activated.`
          : "Your order is confirmed. Course and test-series access has been activated.",
        free: state.title ? `You now have access to ${state.title}.` : "You now have access to this course.",
        failed: "We could not process your payment. No money was charged, or it will be auto-refunded.",
        cancelled: "You cancelled the payment. You can try again any time.",
        pending: "Cashfree is still confirming. We'll mark your order paid as soon as it clears.",
        error: state.message || "Something went wrong.",
      }[state.status];

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <Seo title="Thank You" raw description="Bansal Classes confirmation." noindex />
      <div className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex justify-center">{icon}</div>
        <h1 className="mt-4 font-display text-2xl font-black">{heading}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        {state.amount != null && state.status === "paid" && (
          <p className="mt-3 text-lg font-black text-foreground">₹{Number(state.amount).toLocaleString("en-IN")}</p>
        )}
        {state.admitCardNumber && (
          <div className="mt-5 inline-block rounded-xl bg-bansal-cream border-2 border-bansal-orange px-6 py-3">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase">Admit card</div>
            <div className="font-mono text-xl font-bold text-bansal-blue mt-1">{state.admitCardNumber}</div>
          </div>
        )}
        <div className="mt-6 flex flex-col gap-2">
          {isBoost ? (
            <>
              <Link to="/boost" className="rounded-xl bg-[hsl(var(--bansal-orange))] py-2.5 font-bold text-white">
                Back to BOOST
              </Link>
              <Link to="/" className="text-xs text-muted-foreground underline">
                Back to home
              </Link>
            </>
          ) : (
            <>
              <Link to="/orders" className="rounded-xl bg-[hsl(var(--bansal-orange))] py-2.5 font-bold text-white">
                View My Orders
              </Link>
              <Link to="/my-courses" className="rounded-xl border border-border py-2.5 font-semibold">
                Go to My Courses
              </Link>
              <Link to="/" className="text-xs text-muted-foreground underline">
                Back to home
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
