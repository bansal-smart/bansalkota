import { useState } from "react";
import { z } from "zod";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/useAppStore";
import { startCashfreeCheckout } from "@/lib/cashfree";
import BansalButton from "@/components/bansal/BansalButton";
import CityAutocompleteInput from "@/components/CityAutocompleteInput";

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Valid email required").max(255),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")),
  class_level: z.string().min(1, "Select your class"),
  school_name: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  parent_name: z.string().trim().max(120).optional().or(z.literal("")),
  parent_phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^$|^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"))
    .optional()
    .or(z.literal("")),
});

const CLASS_LEVELS = ["IX", "X", "XI", "XII", "Dropper"];

type TestSeriesInfo = { id: string; title: string; target_exam: string | null; price: number };
type Props = { open: boolean; onClose: () => void; testSeries: TestSeriesInfo };

function onlyDigitsInput(e: React.FormEvent<HTMLInputElement>) {
  const el = e.currentTarget;
  el.value = el.value.replace(/\D/g, "").slice(0, 10);
}

const inputClass =
  "w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-bansal-orange";

export default function TestSeriesRegistrationModal({ open, onClose, testSeries }: Props) {
  const user = useAppStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  if (!open) return null;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to continue");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(fd.entries()) as Record<string, string>;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
      toast.error(first || "Please check the form");
      return;
    }
    setSubmitting(true);
    const payload = {
      user_id: user.id,
      test_series_id: testSeries.id,
      test_series_title: testSeries.title,
      target_exam: testSeries.target_exam,
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      class_level: parsed.data.class_level,
      school_name: parsed.data.school_name || null,
      city: parsed.data.city || null,
      state: parsed.data.state || null,
      parent_name: parsed.data.parent_name || null,
      parent_phone: parsed.data.parent_phone || null,
    };
    const { data: inserted, error } = await supabase
      .from("test_series_registrations")
      .insert([payload as any])
      .select("id")
      .single();
    if (error || !inserted) {
      setSubmitting(false);
      toast.error(error?.message || "Could not save registration");
      return;
    }
    try {
      const result = await startCashfreeCheckout({ orderType: "test_series", testSeriesId: testSeries.id });
      const { error: linkErr } = await supabase.rpc("link_test_series_registration_order", {
        p_registration_id: inserted.id,
        p_order_id: (result as { order_id: string }).order_id,
      });
      if (linkErr) console.error("Failed to link registration to order", linkErr);
      onClose();
    } catch (err) {
      toast.error((err as Error).message || "Could not start payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={() => !submitting && onClose()} />
      <div className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-border bg-card">
          <div>
            <h2 className="font-display text-xl font-bold text-bansal-black">Register for {testSeries.title}</h2>
            <p className="text-xs text-muted-foreground">Just a few details before you proceed to payment.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Full name *</label>
              <input name="full_name" required defaultValue={user?.full_name ?? ""} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Email *</label>
              <input name="email" type="email" required defaultValue={user?.email ?? ""} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Mobile *</label>
              <input
                name="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                onInput={onlyDigitsInput}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Class *</label>
              <select name="class_level" required defaultValue="" className={inputClass}>
                <option value="" disabled>Select class</option>
                {CLASS_LEVELS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">School name</label>
              <input name="school_name" className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">City</label>
              <CityAutocompleteInput
                name="city"
                value={city}
                onChange={setCity}
                onSelectCity={(c, s) => { setCity(c); setState(s); }}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">State</label>
              <input name="state" value={state} onChange={(e) => setState(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Parent name</label>
              <input name="parent_name" className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Parent phone</label>
              <input
                name="parent_phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                onInput={onlyDigitsInput}
                className={inputClass}
              />
            </div>
          </div>

          <div className="rounded-lg bg-bansal-cream/50 border border-bansal-orange/30 p-4 text-sm">
            <div className="font-semibold text-bansal-black">
              Enrollment fee: ₹{Number(testSeries.price).toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              You'll be redirected to Cashfree's secure checkout (UPI, cards, netbanking, wallets) to complete payment.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <BansalButton variant="cta" disabled={submitting} type="submit">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue to payment"}
            </BansalButton>
          </div>
        </form>
      </div>
    </div>
  );
}
