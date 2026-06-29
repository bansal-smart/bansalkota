import { useState } from "react";
import { Send, CheckCircle2, Loader2, Phone, Mail, User, GraduationCap, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import BansalBadge from "@/components/bansal/BansalBadge";
import BansalButton from "@/components/bansal/BansalButton";
import { toast } from "sonner";
import { postSubmission } from "@/content/postSubmissionMessages";
import { sendConfirmation } from "@/lib/sendConfirmation";

import { CLASS_LEVELS } from "@/lib/constants";

const exams = ["JEE", "NEET", "Foundation", "Olympiad", "Not sure yet"];
const classes = [...CLASS_LEVELS];

const LandingCTAForm = () => {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    classLevel: "Class 11",
    exam: "JEE",
    message: "",
  });

  const update = (k: keyof typeof form) => (e: any) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.email) {
      toast.error("Please fill name, phone and email");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("enquiries").insert({
      name: form.name,
      phone: form.phone,
      email: form.email,
      message: form.message || `Wants info for ${form.exam} · ${form.classLevel}`,
      source: "landing_page",
      source_type: "landing_cta",
      category: form.exam.toLowerCase(),
      priority: "high",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not submit. Please try again.");
      return;
    }
    setDone(true);
    toast.success(postSubmission.enquiry.toast);
    void sendConfirmation({
      templateName: "enquiry-confirmation",
      recipientEmail: form.email,
      idempotencyKey: `enquiry-cta-${form.email}-${Date.now()}`,
      templateData: { name: form.name, source: "landing", message: form.message },
    });
  };

  return (
    <section id="lead-form" className="relative py-12 md:py-20 bg-bansal-blue text-white overflow-hidden">
      <div className="absolute inset-0 grid-texture opacity-50" />
      <div className="free-counseling container mx-auto px-4 grid lg:grid-cols-2 gap-10 items-center relative">
        <div>
          <BansalBadge tone="orange">Free Counselling</BansalBadge>
          <h2 className="mt-4 font-display text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight">
            Start Your <span className="text-bansal-orange">Rank Journey</span> Today
          </h2>
          <p className="mt-4 text-white/85 max-w-lg">
            Tell us about your goals — a senior Bansal counsellor will personally call you within 24 hours with a study
            plan, scholarship eligibility and the right batch for you.
          </p>
          <ul className="mt-6 space-y-2 text-sm">
            {[
              "Personalised batch recommendation",
              "Scholarship eligibility check",
              "EMI & fee structure walkthrough",
              "No spam. No pressure. Ever.",
            ].map((l) => (
              <li key={l} className="flex items-center gap-2 text-white/90">
                <CheckCircle2 className="h-4 w-4 text-bansal-orange" /> {l}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl bg-white text-bansal-black p-6 md:p-8 shadow-2xl">
          {done ? (
            <div className="py-10 text-center">
              <div className="h-16 w-16 rounded-full bg-emerald-100 grid place-items-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold">
                {postSubmission.enquiry.title(form.name.split(" ")[0])}
              </h3>
              <p className="mt-2 text-sm text-bansal-gray">{postSubmission.enquiry.body(form.phone)}</p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <a
                  href={postSubmission.enquiry.whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 text-white px-4 py-2 text-xs font-bold hover:bg-emerald-700"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> {postSubmission.enquiry.ctaLabel}
                </a>
                <a
                  href={postSubmission.enquiry.callHref}
                  className="inline-flex items-center gap-1.5 rounded-full border border-bansal-blue/30 text-bansal-blue px-4 py-2 text-xs font-bold hover:bg-bansal-blue hover:text-white transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" /> {postSubmission.enquiry.callLabel}
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <h3 className="font-display text-lg font-bold mb-2">Book your free 15-min call</h3>
              <Field
                icon={<User className="h-4 w-4" />}
                placeholder="Student / Parent name"
                value={form.name}
                onChange={update("name")}
              />
              <Field
                icon={<Phone className="h-4 w-4" />}
                placeholder="Phone (WhatsApp)"
                type="tel"
                value={form.phone}
                onChange={update("phone")}
              />
              <Field
                icon={<Mail className="h-4 w-4" />}
                placeholder="Email address"
                type="email"
                value={form.email}
                onChange={update("email")}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  icon={<GraduationCap className="h-4 w-4" />}
                  value={form.classLevel}
                  onChange={update("classLevel")}
                  options={classes}
                />
                <Select value={form.exam} onChange={update("exam")} options={exams} />
              </div>
              <textarea
                placeholder="Any specific questions? (optional)"
                value={form.message}
                onChange={update("message")}
                rows={2}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bansal-orange"
              />
              <BansalButton variant="cta" type="submit" className="w-full justify-center" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Request Callback
                  </>
                )}
              </BansalButton>
              <p className="text-[11px] text-bansal-gray text-center">
                By submitting you agree to be contacted by Bansal Classes counsellors. We never share your data.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

const Field = ({ icon, ...rest }: any) => (
  <div className="relative">
    <span className="absolute inset-y-0 left-3 grid place-items-center text-bansal-gray">{icon}</span>
    <input
      {...rest}
      className="w-full rounded-lg border border-border pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-bansal-orange"
    />
  </div>
);

const Select = ({ icon, options, ...rest }: any) => (
  <div className="relative">
    {icon && <span className="absolute inset-y-0 left-3 grid place-items-center text-bansal-gray">{icon}</span>}
    <select
      {...rest}
      className={`w-full rounded-lg border border-border ${icon ? "pl-9" : "pl-3"} pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bansal-orange`}
    >
      {options.map((o: string) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </div>
);

export default LandingCTAForm;
