import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import CityAutocompleteInput from "@/components/CityAutocompleteInput";
import CouponInput from "@/components/CouponInput";
import { setPendingEnrollment } from "@/lib/pendingEnrollment";
import { generateId } from "@/lib/uuid";
import { trackCompleteRegistrationOnce, trackInitiateCheckout } from "@/lib/metaPixel";
import { INDIAN_STATES_AND_UTS } from "@/lib/indianStates";

type Centre = { id: string; name: string };

type Course = { id: string; name: string; price: number | string; centreId?: string };

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
  state: z.enum(INDIAN_STATES_AND_UTS, { errorMap: () => ({ message: "Select a state" }) }),
  preferred_centre_id: z.string().optional(),
  message: z.string().max(1000).optional(),
});

const CourseEnquiryDialog = ({ open, onOpenChange, course }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [centres, setCentres] = useState<Centre[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
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

  // Form is anonymous-only — a logged-in user is already a known lead, so
  // fetch centres (for the "preferred centre" field) only when it'll render.
  useEffect(() => {
    if (!open || user) return;
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
  }, [open, user]);

  // Logged-in users skip the enquiry form entirely — we already have their
  // lead via their account. A free course enrolls directly with no payment
  // step; a paid course shows a short confirm step (with a coupon box) below.
  useEffect(() => {
    if (!open || !user || Number(course.price) !== 0) return;
    let cancelled = false;
    (async () => {
      setSubmitting(true);
      try {
        const { error } = await supabase.from("enrollments").upsert(
          {
            user_id: user.id,
            course_id: course.id,
            is_active: true,
            last_accessed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,course_id" },
        );
        if (error) throw error;
        trackCompleteRegistrationOnce(`course:${user.id}:${course.id}`, { content_name: course.name });
        if (!cancelled) {
          navigate("/thank-you/course", {
            state: { type: "course", status: "free", title: course.name },
          });
        }
      } catch (e: any) {
        if (!cancelled) toast.error(e?.message || "Could not enroll");
      } finally {
        if (!cancelled) {
          setSubmitting(false);
          onOpenChange(false);
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, course.id]);

  const coursePrice = Number(course.price);
  const discount = coupon ? Math.max(0, Math.min(coupon.discount, coursePrice - 1)) : 0;
  const payable = coursePrice - discount;

  const payNow = async () => {
    setSubmitting(true);
    try {
      trackInitiateCheckout({ content_name: course.name, value: payable, currency: "INR" });
      await startCashfreeCheckout({
        orderType: "course",
        courseId: course.id,
        centreId: course.centreId,
        couponCode: coupon?.code,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Could not start payment");
    } finally {
      setSubmitting(false);
    }
  };

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
      // Generate the row id client-side and skip `.select()` (i.e. no RETURNING).
      // Students have no SELECT policy on course_enquiries (only admins do), and
      // requesting the row back via RETURNING fails RLS even though the INSERT
      // itself is permitted — so we never need the server to hand the id back.
      const enquiryId = generateId();

      // Persist the enquiry so admins have the lead (this form only ever runs
      // for anonymous visitors — logged-in users skip it, see the effect above).
      const { error: insErr } = await supabase
        .from("course_enquiries")
        .insert({
          id: enquiryId,
          course_id: course.id,
          course_name: course.name,
          course_price: Number(course.price),
          user_id: null,
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
        });
      if (insErr) throw insErr;

      // Remember what they were trying to enroll in — once they authenticate
      // and (if needed) complete their profile, ProfileCompletionDialog picks
      // this up and resumes straight to Cashfree checkout.
      setPendingEnrollment({
        courseId: course.id,
        enquiryId,
        courseName: course.name,
        coursePrice: Number(course.price),
        createdAt: Date.now(),
        centreId: course.centreId,
        couponCode: coupon?.code,
      });
      toast.success("Enquiry saved! Verify your mobile number to continue to payment.");
      onOpenChange(false);
      setSubmitting(false);
      navigate("/login");
    } catch (e: any) {
      toast.error(e?.message || "Could not save your enquiry");
      setSubmitting(false);
    }
  };

  // Logged-in users never see the enquiry form. Free courses render nothing
  // while the effect above enrolls them; paid courses get a confirm step.
  if (user && coursePrice === 0) return null;

  if (user) {
    return (
      <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Enroll in {course.name}</DialogTitle>
            <DialogDescription>One-time payment · secure checkout by Cashfree</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-bold uppercase text-muted-foreground">Total</p>
              <p className="text-2xl font-black text-foreground">₹{payable.toLocaleString("en-IN")}</p>
              {discount > 0 && (
                <p className="text-xs text-muted-foreground">
                  <span className="line-through">₹{coursePrice.toLocaleString("en-IN")}</span> · coupon {coupon?.code}
                </p>
              )}
            </div>
            <CouponInput
              scope="course"
              subtotal={coursePrice}
              disabled={submitting}
              onApplied={(code, d) => setCoupon({ code, discount: d })}
              onRemoved={() => setCoupon(null)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={payNow} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <CreditCard className="h-4 w-4 mr-1.5" />}
              Pay ₹{payable.toLocaleString("en-IN")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="w-[calc(100%-2rem)] sm:w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Enquiry & Enrollment</DialogTitle>
          <DialogDescription>
            Confirm your details for <span className="font-semibold text-foreground">{course.name}</span>. We'll save
            your enquiry — you'll just need to verify your mobile number next to continue to payment.
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
              <CityAutocompleteInput
                id="ce-city"
                value={form.city}
                onChange={(v) => update("city", v)}
                onSelectCity={(city, state) => setForm((f) => ({ ...f, city, state }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="ce-state">State *</Label>
              <Select value={form.state} onValueChange={(v) => update("state", v)}>
                <SelectTrigger id="ce-state">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES_AND_UTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          {coursePrice > 0 && (
            <CouponInput
              scope="course"
              subtotal={coursePrice}
              disabled={submitting}
              onApplied={(code, d) => setCoupon({ code, discount: d })}
              onRemoved={() => setCoupon(null)}
            />
          )}
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <CreditCard className="h-3 w-3" /> After verifying your mobile number, you'll be redirected to Cashfree to pay ₹
            {payable.toLocaleString()}.
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
