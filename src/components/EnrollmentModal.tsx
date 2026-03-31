import { useState } from "react";
import { X, Check, CreditCard, Smartphone, Building, Lock, PartyPopper, AlertCircle, IndianRupee } from "lucide-react";

interface EnrollmentModalProps {
  open: boolean;
  onClose: () => void;
  courseName?: string;
}

const plans = [
  { id: "monthly", label: "Monthly", price: "₹999/month", desc: "Cancel anytime", recommended: false },
  { id: "annual", label: "Annual", price: "₹7,999/year", desc: "SAVE 33%", recommended: true },
  { id: "course", label: "This Course Only", price: "₹1,999", desc: "One-time payment", recommended: false },
];

const includes = ["120 Lectures", "45 Live Classes", "30 Tests", "PDFs & Notes", "Doubt Support"];

const EnrollmentModal = ({ open, onClose, courseName = "JEE Physics Booster" }: EnrollmentModalProps) => {
  const [step, setStep] = useState<"plan" | "payment" | "success" | "error">("plan");
  const [selectedPlan, setSelectedPlan] = useState("annual");
  const [paymentMethod, setPaymentMethod] = useState("upi");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-card shadow-xl border border-border overflow-y-auto max-h-[90vh]">
        <button onClick={onClose} className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground hover:bg-background z-10"><X className="h-4 w-4" /></button>

        {/* Step 1: Plan Selection */}
        {step === "plan" && (
          <div className="p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">Enroll in Course</h2>
              <p className="text-xs text-muted-foreground mt-1">{courseName}</p>
            </div>

            <div className="space-y-2">
              {plans.map((p) => (
                <button key={p.id} onClick={() => setSelectedPlan(p.id)} className={`w-full flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${selectedPlan === p.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}>
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

            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">What's included</p>
              <div className="grid grid-cols-2 gap-1">
                {includes.map((i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-foreground"><Check className="h-3 w-3 text-secondary shrink-0" />{i}</div>
                ))}
              </div>
            </div>

            <button onClick={() => setStep("payment")} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Continue to Payment</button>
          </div>
        )}

        {/* Step 2: Payment Method */}
        {step === "payment" && (
          <div className="p-5 space-y-4">
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{plans.find(p => p.id === selectedPlan)?.label}</span>
              <span className="text-sm font-bold text-primary">{plans.find(p => p.id === selectedPlan)?.price}</span>
            </div>

            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Payment Method</p>
              <div className="space-y-2">
                {[
                  { id: "card", label: "Credit / Debit Card", icon: CreditCard },
                  { id: "upi", label: "UPI", icon: Smartphone },
                  { id: "netbanking", label: "Net Banking", icon: Building },
                ].map((m) => (
                  <button key={m.id} onClick={() => setPaymentMethod(m.id)} className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left ${paymentMethod === m.id ? "border-primary bg-primary/5" : "border-border"}`}>
                    <m.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === "card" && (
              <div className="space-y-3">
                <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="Card Number" />
                <div className="grid grid-cols-2 gap-3">
                  <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="MM/YY" />
                  <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="CVV" />
                </div>
                <input className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="Name on Card" />
              </div>
            )}

            <button onClick={() => setStep("success")} className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground flex items-center justify-center gap-2">
              <Lock className="h-3.5 w-3.5" /> Pay {plans.find(p => p.id === selectedPlan)?.price}
            </button>
            <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground"><Lock className="h-3 w-3" /> 256-bit SSL encrypted</div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === "success" && (
          <div className="p-8 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10 mx-auto">
              <PartyPopper className="h-8 w-8 text-secondary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">You're Enrolled!</h2>
            <p className="text-sm text-muted-foreground">{courseName}</p>
            <p className="text-xs text-muted-foreground">Your subscription is active till March 30, 2027</p>
            <button onClick={onClose} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Start Learning</button>
            <button className="text-xs text-primary hover:underline">View Receipt</button>
          </div>
        )}

        {/* Error State */}
        {step === "error" && (
          <div className="p-8 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Payment Failed</h2>
            <p className="text-sm text-muted-foreground">Your payment could not be processed. Please try again.</p>
            <button onClick={() => setStep("payment")} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Retry</button>
            <button onClick={() => setStep("payment")} className="text-xs text-primary hover:underline">Try Different Method</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnrollmentModal;
