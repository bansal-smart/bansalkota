import { Link, useLocation, useParams } from "react-router-dom";
import { CheckCircle2, XCircle, Clock, PartyPopper } from "lucide-react";
import Seo from "@/components/Seo";

export type ThankYouModule = "e_store" | "course" | "test_series" | "boost";

export type ThankYouState = {
  type?: ThankYouModule;
  status: "paid" | "free" | "failed" | "cancelled" | "pending" | "error";
  title?: string;
  amount?: number;
  admitCardNumber?: string;
  message?: string;
};

const moduleCopy: Record<ThankYouModule, {
  label: string;
  directTitle: string;
  directBody: string;
  primaryLink: string;
  primaryLabel: string;
  secondaryLink?: string;
  secondaryLabel?: string;
}> = {
  e_store: {
    label: "E-Store order",
    directTitle: "E-Store confirmation",
    directBody: "Payment confirmations are shown here after checkout. You can also review your orders at any time.",
    primaryLink: "/orders",
    primaryLabel: "View My Orders",
  },
  course: {
    label: "course enrolment",
    directTitle: "Course enrolment confirmation",
    directBody: "Your enrolment confirmation appears here after payment. Your active courses are always available from My Courses.",
    primaryLink: "/my-courses",
    primaryLabel: "Go to My Courses",
  },
  test_series: {
    label: "test-series registration",
    directTitle: "Test-series registration confirmation",
    directBody: "Your registration confirmation appears here after payment. You can find active test series in My Tests.",
    primaryLink: "/my-tests",
    primaryLabel: "Go to My Tests",
  },
  boost: {
    label: "BOOST registration",
    directTitle: "BOOST registration confirmation",
    directBody: "Your BOOST registration confirmation and admit-card details appear here after payment.",
    primaryLink: "/boost",
    primaryLabel: "Back to BOOST",
  },
};

const ThankYouPage = ({ module }: { module?: ThankYouModule }) => {
  const location = useLocation();
  const { module: moduleParam } = useParams();
  const state = (location.state as ThankYouState | null) ?? null;
  const routeModule = ["e_store", "course", "test_series", "boost"].includes(moduleParam ?? "")
    ? moduleParam as ThankYouModule
    : undefined;
  const pageModule = module ?? state?.type ?? routeModule ?? "e_store";
  const copy = moduleCopy[pageModule];

  // Direct visit, refresh, or a bookmarked/shared link carries no router
  // state — never fabricate a success screen in that case.
  if (!state) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
        <Seo title="Thank You" raw description="Bansal Classes confirmation." noindex />
        <div className="max-w-md w-full text-center rounded-2xl border border-border bg-card p-8 shadow-sm">
          <h1 className="font-display text-2xl font-black">{copy.directTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {copy.directBody}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to={copy.primaryLink} className="rounded-xl bg-[hsl(var(--bansal-orange))] py-2.5 font-bold text-white">
              {copy.primaryLabel}
            </Link>
            <Link to="/" className="text-xs text-muted-foreground underline">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isBoost = pageModule === "boost";

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
          : `Your ${copy.label} is confirmed. Access has been activated.`,
        free: state.title ? `You now have access to ${state.title}.` : `Your ${copy.label} is confirmed.`,
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
          <Link to={copy.primaryLink} className="rounded-xl bg-[hsl(var(--bansal-orange))] py-2.5 font-bold text-white">
            {copy.primaryLabel}
          </Link>
          <Link to="/" className="text-xs text-muted-foreground underline">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
