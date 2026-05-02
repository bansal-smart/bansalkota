import { useEffect, useState } from "react";
import { X, PartyPopper, AlertCircle, Info, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { dispatchEmailOnly } from "@/lib/notify";
import { useAppStore } from "@/store/useAppStore";

interface EnrollmentModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseName: string;
  coursePrice: number;
  onEnrolled?: () => void;
}

const EnrollmentModal = ({ open, onClose, courseId, courseName, coursePrice, onEnrolled }: EnrollmentModalProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"plan" | "success" | "error">("plan");
  const [submitting, setSubmitting] = useState(false);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const roles = (data ?? []).map((r) => r.role);
        setIsStaff(roles.includes("admin") || roles.includes("super_admin"));
      });
  }, [user]);

  if (!open) return null;

  const close = () => {
    setStep("plan");
    onClose();
  };

  const handleStaffDemoEnroll = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("enrollments")
      .insert({ user_id: user.id, course_id: courseId, is_active: true, last_accessed_at: new Date().toISOString() });
    if (error && !error.message.includes("duplicate")) {
      console.error(error);
      setStep("error");
      setSubmitting(false);
      return;
    }
    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "You're enrolled (staff demo)",
      body: `Welcome to ${courseName}.`,
      type: "course",
      link: `/my-courses`,
    });
    // Send payment-receipt email (respects user preferences). Demo amount = course price.
    if (user.email) {
      const country = useAppStore.getState().country;
      const currency = country === "dubai" ? "AED" : "INR";
      const amount = country === "dubai" ? Math.round(coursePrice / 22) : coursePrice;
      void dispatchEmailOnly({
        recipientUserId: user.id,
        recipientEmail: user.email,
        category: "payment_receipt",
        templateName: "payment-receipt",
        idempotencyKey: `enroll-${user.id}-${courseId}`,
        templateData: {
          name: user.user_metadata?.full_name || "Learner",
          courseName,
          amount,
          currency,
          orderId: `DEMO-${courseId.slice(0, 8)}`,
          paidAt: new Date().toISOString(),
        },
      });
    }
    setSubmitting(false);
    setStep("success");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="relative w-full max-w-md rounded-2xl bg-card shadow-xl border border-border overflow-y-auto max-h-[90vh]">
        <button onClick={close} className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-background z-10">
          <X className="h-4 w-4" />
        </button>

        {step === "plan" && (
          <div className="p-6 space-y-5 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 mx-auto">
              <Info className="h-8 w-8 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Payment integration is not yet implemented</h2>
              <p className="text-xs text-muted-foreground mt-2">
                Enrollment for <span className="font-semibold text-foreground">{courseName}</span> ({`₹${coursePrice.toLocaleString()}`}) requires a
                payment gateway. Razorpay (India) and Stripe (Dubai) will be wired in next.
              </p>
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-left">
              <p className="text-[11px] font-bold text-foreground uppercase mb-1">Coming soon</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex gap-2"><Check className="h-3 w-3 text-secondary mt-0.5 shrink-0" /> Razorpay UPI / Card / Netbanking (India)</li>
                <li className="flex gap-2"><Check className="h-3 w-3 text-secondary mt-0.5 shrink-0" /> Stripe Card payments (Dubai)</li>
                <li className="flex gap-2"><Check className="h-3 w-3 text-secondary mt-0.5 shrink-0" /> Auto-receipt emails + invoice download</li>
              </ul>
            </div>

            <button onClick={close} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              Got it
            </button>

            {isStaff && (
              <button
                onClick={handleStaffDemoEnroll}
                disabled={submitting}
                className="w-full rounded-lg border border-dashed border-primary/40 px-4 py-2 text-[11px] font-medium text-primary disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Staff: Demo enroll without payment
              </button>
            )}
          </div>
        )}

        {step === "success" && (
          <div className="p-8 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10 mx-auto">
              <PartyPopper className="h-8 w-8 text-secondary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">You're Enrolled!</h2>
            <p className="text-sm text-muted-foreground">{courseName}</p>
            <button
              onClick={() => {
                onEnrolled?.();
                close();
              }}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Start Learning
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="p-8 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Enrollment Failed</h2>
            <p className="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
            <button onClick={() => setStep("plan")} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnrollmentModal;
