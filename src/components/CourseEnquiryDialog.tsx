import { useEffect, useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { startCashfreeCheckout } from "@/lib/cashfree";
import { toast } from "sonner";

type Centre = { id: string; name: string };

type Course = { id: string; name: string; price: number | string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course;
}

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")),
  parent_phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().regex(/^$|^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"))
    .optional(),
  city: z.string().trim().min(1, "Enter city").max(80),
  state: z.string().trim().min(1, "Enter state").max(80),
  preferred_centre_id: z.string().optional(),
  message: z.string().max(1000).optional(),
});

const CourseEnquiryDialog = ({ open, onOpenChange, course }: Props) => {
  const { user } = useAuth();
  const [centres, setCentres] = useState<Centre[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    parent_phone: "",
    city: "",
    state: "",
    preferred_centre_id: "",
    message: "",
  });

  useEffect(() => {
    if (!open) return;
    supabase
      .from("centres")
      .select("id, city, area")
      .order("city")
      .then(({ data }) => {
        const rows = ((data as Array<{ id: string; city: string; area: string | null }> | null) ?? []).map((c) => ({
          id: c.id,
          name: c.area ? `${c.city} — ${c.area}` : c.city,
        }));
        setCentres(rows);
      });
    if (user) {
      supabase
        .from("profiles")
        .select("full_name, phone, city, state")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          setForm((f) => ({
            ...f,
            full_name: data?.full_name || f.full_name,
            email: user.email || f.email,
            phone: data?.phone || f.phone,
            city: data?.city || f.city,
            state: data?.state || f.state,
          }));
        });
    }
  }, [open, user]);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      toast.error(first?.message || "Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      // 1) Persist enquiry first so admins always see the lead.
      const { data: enquiry, error: insErr } = await supabase
        .from("course_enquiries")
        .insert({
          course_id: course.id,
          course_name: course.name,
          course_price: Number(course.price),
          user_id: user?.id || null,
          full_name: parsed.data.full_name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          parent_phone: parsed.data.parent_phone || null,
          city: parsed.data.city,
          state: parsed.data.state,
          preferred_centre_id: parsed.data.preferred_centre_id || null,
          message: parsed.data.message || null,
          payment_status: "pending",
          status: "new",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      if (!user) {
        toast.success("Enquiry submitted. A counsellor will contact you soon.");
        onOpenChange(false);
        setSubmitting(false);
        return;
      }

      // 2) Kick off Cashfree checkout — backend links enquiry to order.
      await startCashfreeCheckout({
        orderType: "course",
        courseId: course.id,
        enquiryId: enquiry.id,
      } as any);
    } catch (e: any) {
      toast.error(e?.message || "Could not start payment");
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Enquiry & Enrollment</DialogTitle>
          <DialogDescription>
            Confirm your details for <span className="font-semibold text-foreground">{course.name}</span>. We'll save
            your enquiry, then take you to the secure payment page.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 mt-2">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ce-name">Full name *</Label>
              <Input id="ce-name" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ce-phone">Phone *</Label>
              <Input
                id="ce-phone"
                type="tel"
                inputMode="numeric"
                pattern="[6-9][0-9]{9}"
                maxLength={10}
                placeholder="10-digit mobile"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ce-email">Email *</Label>
            <Input id="ce-email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ce-parent-phone">Parent's phone</Label>
            <Input
              id="ce-parent-phone"
              type="tel"
              inputMode="numeric"
              pattern="[6-9][0-9]{9}"
              maxLength={10}
              placeholder="10-digit mobile (optional)"
              value={form.parent_phone}
              onChange={(e) => update("parent_phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
          </div>
          <div>
            <Label>Preferred centre</Label>
            <Select value={form.preferred_centre_id} onValueChange={(v) => update("preferred_centre_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Any centre" />
              </SelectTrigger>
              <SelectContent>
                {centres.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ce-city">City *</Label>
              <Input id="ce-city" value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ce-state">State *</Label>
              <Input id="ce-state" value={form.state} onChange={(e) => update("state", e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="ce-msg">Message (optional)</Label>
            <Textarea
              id="ce-msg"
              rows={3}
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              placeholder="Any questions for our counsellors?"
            />
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <CreditCard className="h-3 w-3" /> You'll be redirected to Cashfree to pay ₹
            {Number(course.price).toLocaleString()}.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Processing…
              </>
            ) : (
              <>Submit</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CourseEnquiryDialog;
