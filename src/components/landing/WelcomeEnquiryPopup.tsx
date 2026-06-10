import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sparkles, Rocket, Stethoscope, Loader2, CheckCircle2, Phone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BansalButton from "@/components/bansal/BansalButton";

const STORAGE_KEY = "bansal_welcome_popup_v1";

const WelcomeEnquiryPopup = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [goal, setGoal] = useState<"Engineer (JEE)" | "Doctor (NEET)" | "Not sure yet">("Engineer (JEE)");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setOpen(true), 4500);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setOpen(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Please enter your name");
      return;
    }
    if (!/^\d{10}$/.test(phone.replace(/\D/g, "").slice(-10))) {
      toast.error("Please enter a valid 10-digit mobile");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("enquiries").insert({
      name: name.trim().slice(0, 100),
      phone: phone.replace(/\D/g, "").slice(-10),
      email: null,
      message: `Welcome popup: Wants to start ${goal} journey`,
      source: "landing_page",
      source_type: "welcome_popup",
      category: goal.includes("NEET") ? "neet" : goal.includes("JEE") ? "jee" : "general",
      priority: "high",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not submit. Please try again.");
      return;
    }
    setDone(true);
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    toast.success("We'll call you within 24 hours!");
    setTimeout(() => setOpen(false), 2400);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
      <DialogContent className="p-0 overflow-hidden max-w-md border-0 bg-transparent shadow-2xl">
        <div className="relative rounded-2xl overflow-hidden bg-white">
          {/* Header band */}
          <div className="relative bg-gradient-to-br from-bansal-blue via-bansal-blue to-[#0b1a33] text-white px-6 pt-6 pb-8">
            <div className="absolute inset-0 grid-texture opacity-30" />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-bansal-orange/15 border border-bansal-orange/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-bansal-orange">
                <Sparkles className="h-3 w-3" /> Free Counselling
              </div>
              <h3 className="mt-3 font-display text-2xl md:text-[26px] font-extrabold leading-tight">
                Want to start your <span className="text-bansal-orange">Engineer</span> or{" "}
                <span className="text-bansal-orange">Doctor</span> journey?
              </h3>
              <p className="mt-2 text-sm text-white/85">
                Let's connect. Drop your name & mobile — a senior Bansal mentor will call you within 24 hours.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 pb-6 pt-5">
            {done ? (
              <div className="py-8 text-center">
                <div className="h-14 w-14 rounded-full bg-emerald-100 grid place-items-center mx-auto">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                </div>
                <h4 className="mt-3 font-display text-lg font-bold text-bansal-black">Thank you, {name.split(" ")[0]}!</h4>
                <p className="mt-1 text-sm text-bansal-gray">Our counsellor will call you on {phone} shortly.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-bansal-gray">Goal</label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {([
                      { label: "Engineer (JEE)", icon: Rocket },
                      { label: "Doctor (NEET)", icon: Stethoscope },
                      { label: "Not sure yet", icon: Sparkles },
                    ] as const).map(({ label, icon: Icon }) => (
                      <button
                        type="button"
                        key={label}
                        onClick={() => setGoal(label)}
                        className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-2.5 text-[11px] font-semibold transition ${
                          goal === label
                            ? "border-bansal-orange bg-bansal-orange/10 text-bansal-black"
                            : "border-bansal-cream bg-white text-bansal-gray hover:border-bansal-orange/40"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-bansal-gray">Your Name</label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bansal-gray" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      placeholder="Student / parent name"
                      className="w-full rounded-xl border-2 border-bansal-cream bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-bansal-orange"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-bansal-gray">Mobile Number</label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-bansal-gray" />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                      inputMode="numeric"
                      placeholder="10-digit mobile"
                      className="w-full rounded-xl border-2 border-bansal-cream bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-bansal-orange"
                    />
                  </div>
                </div>

                <BansalButton type="submit" variant="primary" className="w-full justify-center" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>Call Me Back</>
                  )}
                </BansalButton>

                <button
                  type="button"
                  onClick={dismiss}
                  className="w-full text-center text-xs text-bansal-gray hover:text-bansal-black underline-offset-2 hover:underline"
                >
                  Maybe later
                </button>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeEnquiryPopup;
