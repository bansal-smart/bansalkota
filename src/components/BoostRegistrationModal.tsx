import { useState } from "react";
import { z } from "zod";
import { Loader2, CheckCircle2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BansalButton from "@/components/bansal/BansalButton";
import { useCenters } from "@/hooks/useCenters";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z.string().trim().regex(/^[+\d\s-]{8,15}$/, "Valid phone required"),
  whatsapp: z.string().trim().max(20).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  class_level: z.string().min(1, "Select your class"),
  target_exam: z.string().min(1, "Select your target exam"),
  school_name: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  parent_name: z.string().trim().max(120).optional().or(z.literal("")),
  parent_phone: z.string().trim().max(20).optional().or(z.literal("")),
  preferred_centre_id: z.string().optional().or(z.literal("")),
  exam_slot: z.string().min(1, "Choose an exam slot"),
});

const CLASS_LEVELS = ["Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12", "Dropper"];
const EXAMS = ["JEE", "NEET", "NTSE", "Olympiad", "Foundation / School"];
const SLOTS = [
  "Online · Next Sunday 10:00 AM",
  "Online · Next Sunday 3:00 PM",
  "Offline · Next Sunday 10:00 AM (preferred centre)",
];

type Props = { open: boolean; onClose: () => void };

export default function BoostRegistrationModal({ open, onClose }: Props) {
  const { centers } = useCenters();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ admit_card_number: string } | null>(null);

  if (!open) return null;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd.entries()) as Record<string, string>;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      toast.error(first || "Please check the form");
      return;
    }
    setSubmitting(true);
    const centre = centers.find((c) => c.id === parsed.data.preferred_centre_id);
    const payload = {
      ...parsed.data,
      date_of_birth: parsed.data.date_of_birth || null,
      preferred_centre_id: parsed.data.preferred_centre_id || null,
      preferred_centre_label: centre ? `${centre.city}${centre.area ? " — " + centre.area : ""}` : null,
      amount: 99,
      payment_status: "pending",
    };
    const { data, error } = await supabase
      .from("boost_registrations")
      .insert([payload as any])
      .select("admit_card_number")
      .single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setSuccess({ admit_card_number: (data as any).admit_card_number });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-2xl bg-card rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-border bg-card">
          <div>
            <h2 className="font-display text-xl font-bold text-bansal-black">BOOST 2026 Registration</h2>
            <p className="text-xs text-muted-foreground">Just ₹99 to reserve your scholarship test slot</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="h-5 w-5" /></button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-4">
            <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto" />
            <h3 className="font-display text-2xl font-bold text-bansal-black">Registration confirmed!</h3>
            <p className="text-muted-foreground">Save your admit card number — you'll need it on exam day.</p>
            <div className="inline-block rounded-xl bg-bansal-cream border-2 border-bansal-orange px-6 py-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase">Admit card</div>
              <div className="font-mono text-2xl font-bold text-bansal-blue mt-1">{success.admit_card_number}</div>
            </div>
            <p className="text-xs text-muted-foreground">
              Our team will WhatsApp you within 24 hours with payment link and exam-day instructions.
            </p>
            <BansalButton variant="cta" onClick={onClose}>Done</BansalButton>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="p-5 space-y-4">
            <Section title="Student details">
              <Input name="full_name" label="Full name *" required />
              <Input name="email" label="Email *" type="email" required />
              <Input name="phone" label="Mobile *" required />
              <Input name="whatsapp" label="WhatsApp (if different)" />
              <Input name="date_of_birth" label="Date of birth" type="date" />
              <Select name="class_level" label="Class *" options={CLASS_LEVELS} required />
            </Section>

            <Section title="Academic goals">
              <Select name="target_exam" label="Target exam *" options={EXAMS} required />
              <Input name="school_name" label="School name" />
              <Input name="city" label="City" />
              <Input name="state" label="State" />
            </Section>

            <Section title="Parent / guardian">
              <Input name="parent_name" label="Parent name" />
              <Input name="parent_phone" label="Parent phone" />
            </Section>

            <Section title="Exam slot & centre">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Preferred centre</label>
                <select name="preferred_centre_id" className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <option value="">Online (no centre)</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.city}{c.area && c.area !== c.city ? ` — ${c.area}` : ""}, {c.state}
                    </option>
                  ))}
                </select>
              </div>
              <Select name="exam_slot" label="Exam slot *" options={SLOTS} required />
            </Section>

            <div className="rounded-lg bg-bansal-cream/50 border border-bansal-orange/30 p-4 text-sm">
              <div className="font-semibold text-bansal-black">Registration fee: ₹99</div>
              <p className="text-xs text-muted-foreground mt-1">
                Payment link will be sent to your WhatsApp after submitting this form. Your slot is held for 24 hours.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
                Cancel
              </button>
              <BansalButton variant="cta" disabled={submitting} type="submit">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Registration"}
              </BansalButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <div className="text-xs font-bold uppercase text-bansal-blue mb-2">{title}</div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
  </div>
);

const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <div>
    <label className="text-xs font-semibold text-muted-foreground">{label}</label>
    <input {...props} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bansal-orange" />
  </div>
);

const Select = ({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; options: string[] }) => (
  <div>
    <label className="text-xs font-semibold text-muted-foreground">{label}</label>
    <select {...props} className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm">
      <option value="">Select…</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);
