import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { leadFormSchema, type LeadFormValues, type FormConfig } from "@/lib/landingSchemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Props = { config?: FormConfig; compact?: boolean };

const EMPTY: LeadFormValues = {
  full_name: "",
  phone: "",
  email: "",
  class_level: "",
  city: "",
  message: "",
};

export default function LeadForm({ config = {}, compact = false }: Props) {
  const [values, setValues] = useState<LeadFormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof LeadFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const setField = (k: keyof LeadFormValues, v: string) => {
    setValues((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = leadFormSchema.safeParse(values);
    if (!parsed.success) {
      const errs: any = {};
      parsed.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    const params = new URLSearchParams(window.location.search);
    const payload = {
      ...parsed.data,
      email: parsed.data.email || null,
      class_level: parsed.data.class_level || null,
      city: parsed.data.city || null,
      message: parsed.data.message || null,
      source: "landing_new",
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      user_agent: navigator.userAgent.slice(0, 400),
    };
    const { error } = await supabase.from("landing_page_leads" as any).insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error("Something went wrong. Please try again.");
      return;
    }
    setDone(true);
    setValues(EMPTY);
  };

  if (done) {
    return (
      <div className="rounded-xl bg-card p-6 text-center shadow-lg">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        <h3 className="mt-3 text-lg font-black">You're in!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {config.success_message || "Thanks! Our counsellor will reach out soon."}
        </p>
        <Button variant="outline" className="mt-4" onClick={() => setDone(false)}>
          Register another
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`rounded-xl bg-card p-5 shadow-xl ring-1 ring-border ${compact ? "" : "lg:p-6"}`}
      id="lead-form"
    >
      <div className="mb-4">
        <h3 className="text-lg font-black text-foreground">Reserve your seat</h3>
        <p className="text-xs text-muted-foreground">Limited seats. Free counselling call.</p>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="full_name">Full name *</Label>
          <Input id="full_name" value={values.full_name} onChange={(e) => setField("full_name", e.target.value)} />
          {errors.full_name && <p className="mt-1 text-xs text-destructive">{errors.full_name}</p>}
        </div>
        <div>
          <Label htmlFor="phone">Phone *</Label>
          <Input
            id="phone"
            inputMode="numeric"
            pattern="[6-9][0-9]{9}"
            maxLength={10}
            placeholder="10-digit mobile"
            value={values.phone}
            onChange={(e) => setField("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
          />
          {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={values.email} onChange={(e) => setField("email", e.target.value)} />
          {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
        </div>
        <div>
          <Label htmlFor="class_level">Class / Target exam</Label>
          <select
            id="class_level"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={values.class_level}
            onChange={(e) => setField("class_level", e.target.value)}
          >
            <option value="">Select</option>
            <option>Class 11 - JEE</option>
            <option>Class 12 - JEE</option>
            <option>Dropper - JEE</option>
            <option>Class 11 - NEET</option>
            <option>Class 12 - NEET</option>
            <option>Dropper - NEET</option>
            <option>Foundation (8-10)</option>
            <option>Other</option>
          </select>
        </div>
        {config.show_city !== false && (
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" value={values.city} onChange={(e) => setField("city", e.target.value)} />
          </div>
        )}
        {config.show_message && (
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" rows={3} value={values.message} onChange={(e) => setField("message", e.target.value)} />
          </div>
        )}
      </div>

      <Button type="submit" size="lg" className="mt-4 w-full text-base font-bold" disabled={submitting}>
        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {config.submit_label || "Register Now"}
      </Button>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        By submitting, you agree to be contacted by Bansal Classes.
      </p>
    </form>
  );
}
