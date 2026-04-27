import { useState } from "react";
import { X, Check, CreditCard, Smartphone, Building, Lock, PartyPopper, AlertCircle, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

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
  const [step, setStep] = useState<"plan" | "payment" | "success" | "error">("plan");
  const [selectedPlan, setSelectedPlan] = useState("course");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [submitting, setSubmitting] = useState(false);

  const plans = [
    { id: "monthly", label: "Monthly", price: `₹${Math.round(coursePrice / 6).toLocaleString()}/mo`, desc: "Cancel anytime", recommended: false },
    { id: "annual", label: "Annual", price: `₹${Math.round(coursePrice * 0.7).toLocaleString()}/yr`, desc: "SAVE 30%", recommended: true },
    { id: "course", label: "This Course Only", price: `₹${coursePrice.toLocaleString()}`, desc: "One-time payment", recommended: false },
  ];

  if (!open) return null;

  const handlePay = async () => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    setSubmitting(true);

    // Demo: skip real gateway, write enrollment + notification directly
    const { error: enrollErr } = await supabase
      .from("enrollments")
      .upsert(
        { user_id: user.id, course_id: courseId, is_active: true, last_accessed_at: new Date().toISOString() },
        { onConflict: "user_id,course_id" } as never,
      );

    if (enrollErr) {
      // upsert may not have unique constraint — fallback to insert
      const { error: insertErr } = await supabase
        .from("enrollments")
        .insert({ user_id: user.id, course_id: courseId, is_active: true, last_accessed_at: new Date().toISOString() });
      if (insertErr && !insertErr.message.includes("duplicate")) {
        console.error(insertErr);
        setStep("error");
        setSubmitting(false);
        return;
      }
    }

    await supabase.from("notifications").insert({
      user_id: user.id,
      title: "You're enrolled!",
      body: `Welcome to ${courseName}. Start learning anytime from My Courses.`,
      type: "course",
      link: `/my-courses`,
    });

    setSubmitting(false);
    setStep("success");
  };

  const close = () => {
    setStep("plan");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="relative w-full max-w-md rounded-2xl bg-card shadow-xl border border-border overflow-y-auto max-h-[90vh]">
        <button onClick={close} className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-background z-10">
          <X className="h-4 w-4" />
        </button>

        {step === "plan" && (
          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Enroll in Course</h2>
              <p className="text-xs text-muted-foreground mt-1">{courseName}</p>
            </div>

            <div className="space-y-2">
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`w-full flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
                    selectedPlan === p.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 shrink-0 ${selectedPlan === p.id ? "border-primary bg-primary" : "border-muted"}`}>
                    {selectedPlan === p.id && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{p.label}</span>
                      {p.recommended && <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold text-primary-foreground">RECOMMENDED</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                  </div>
                  <span className="text-sm font-bold text-foreground">{p.price}</span>
                </button>
              ))}
            </div>

            <button onClick={() => setStep("payment")} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              Continue to Payment
            </button>
          </div>
        )}

        {step === "payment" && (
          <div className="p-5 space-y-4">
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                <strong>Demo checkout</strong> — payment gateway not connected yet. Clicking Pay will enroll you instantly so you can try the full experience.
              </p>
            </div>

            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{plans.find((p) => p.id === selectedPlan)?.label}</span>
              <span className="text-sm font-bold text-primary">{plans.find((p) => p.id === selectedPlan)?.price}</span>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Payment Method</p>
              <div className="space-y-2">
                {[
                  { id: "card", label: "Credit / Debit Card", icon: CreditCard },
                  { id: "upi", label: "UPI", icon: Smartphone },
                  { id: "netbanking", label: "Net Banking", icon: Building },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left ${paymentMethod === m.id ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <m.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={submitting}
              onClick={handlePay}
              className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
              {submitting ? "Processing..." : `Pay ${plans.find((p) => p.id === selectedPlan)?.price}`}
            </button>
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
            <button onClick={() => setStep("payment")} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnrollmentModal;
