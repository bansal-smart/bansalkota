import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Loader2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const CLASSES = ["8", "9", "10", "11", "12", "Dropper"];
const STREAMS = ["IIT-JEE", "NEET", "Pre Foundation"];
const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat","Haryana","Himachal Pradesh",
  "Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha",
  "Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

const phoneRegex = /^[0-9+\-\s()]{7,20}$/;

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z.string().trim().regex(phoneRegex, "Enter a valid phone"),
  parent_phone: z.string().trim().regex(phoneRegex, "Enter a valid parent phone"),
  father_name: z.string().trim().min(2, "Enter father's name").max(100),
  class_level: z.string().min(1, "Select your class"),
  target_exam: z.string().min(1, "Select your stream"),
  city: z.string().trim().min(2, "Enter your city").max(100),
  state: z.string().min(1, "Select your state"),
});

function toE164In(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10) return `+91${d}`;
  if (d.length === 12 && d.startsWith("91")) return `+${d}`;
  if (d.length === 11 && d.startsWith("0")) return `+91${d.slice(1)}`;
  return null;
}

const ProfileCompletionDialog = () => {
  const { user, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    parent_phone: "",
    father_name: "",
    class_level: "",
    target_exam: "",
    city: "",
    state: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      setChecking(false);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, parent_phone, father_name, class_level, target_exam, city, state, onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      const p = data as any;
      if (!p?.onboarding_completed) {
        setForm({
          full_name: p?.full_name ?? "",
          phone: p?.phone ?? "",
          parent_phone: p?.parent_phone ?? "",
          father_name: p?.father_name ?? "",
          class_level: p?.class_level ?? "",
          target_exam: p?.target_exam ?? "",
          city: p?.city ?? "",
          state: p?.state ?? "",
        });
        setOpen(true);
      }
      setChecking(false);
    })();
    return () => { active = false; };
  }, [user]);

  const handleSubmit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        fieldErrors[i.path[0] as string] = i.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        ...parsed.data,
        phone_e164: toE164In(parsed.data.phone),
        parent_phone_e164: toE164In(parsed.data.parent_phone),
        onboarding_completed: true,
      } as any)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save your details. Please try again.");
      return;
    }
    toast.success("Welcome aboard!");
    await refreshProfile();
    setOpen(false);
  };

  if (checking || !user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GraduationCap className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center font-display">Complete your profile</DialogTitle>
          <DialogDescription className="text-center">
            We need a few details before you start learning. This takes under a minute.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2 mt-2">
          <Field label="Full Name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} error={errors.full_name} />
          <Field label="Email" value={user.email || ""} disabled />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} error={errors.phone} />
          <Field label="Parent's Phone" value={form.parent_phone} onChange={(v) => setForm({ ...form, parent_phone: v })} error={errors.parent_phone} />
          <Field label="Father's Name" value={form.father_name} onChange={(v) => setForm({ ...form, father_name: v })} error={errors.father_name} />
          <Select label="Class" value={form.class_level} options={CLASSES} onChange={(v) => setForm({ ...form, class_level: v })} error={errors.class_level} />
          <Select label="Stream" value={form.target_exam} options={STREAMS} onChange={(v) => setForm({ ...form, target_exam: v })} error={errors.target_exam} />
          <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} error={errors.city} />
          <Select label="State" value={form.state} options={STATES} onChange={(v) => setForm({ ...form, state: v })} error={errors.state} />
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save and continue
        </button>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({
  label, value, onChange, disabled, error,
}: { label: string; value: string; onChange?: (v: string) => void; disabled?: boolean; error?: string }) => (
  <div>
    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
    <input
      type="text"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
    />
    {error && <p className="mt-0.5 text-[10px] text-destructive">{error}</p>}
  </div>
);

const Select = ({
  label, value, options, onChange, error,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void; error?: string }) => (
  <div>
    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
    >
      <option value="">Select...</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
    {error && <p className="mt-0.5 text-[10px] text-destructive">{error}</p>}
  </div>
);

export default ProfileCompletionDialog;
