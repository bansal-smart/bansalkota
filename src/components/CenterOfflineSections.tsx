import { useEffect, useState } from "react";
import { X, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isValidIndianPhone } from "@/lib/validators";

type Banner = {
  id: string;
  image_url: string;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  cta_url: string | null;
};

export const CenterOfflineSections = ({ centerId, centerCity }: { centerId: string; centerCity: string }) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [admissionOpen, setAdmissionOpen] = useState(false);

  useEffect(() => {
    if (!centerId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("centre_banners")
        .select("*")
        .eq("centre_id", centerId)
        .eq("is_active", true)
        .order("sort_order");
      setBanners(data ?? []);
    })();
  }, [centerId]);

  return (
    <>
      {banners.length > 0 && (
        <section className="py-10 bg-white">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid sm:grid-cols-2 gap-4">
              {banners.map((b) => (
                <a
                  key={b.id}
                  href={b.cta_url || "#"}
                  className="group relative block overflow-hidden rounded-2xl border border-border"
                >
                  <img
                    src={b.image_url}
                    alt={b.title ?? ""}
                    className="h-56 w-full object-cover transition-transform group-hover:scale-105"
                  />
                  {(b.title || b.subtitle) && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bansal-blue/95 to-transparent p-5">
                      {b.title && <p className="font-display font-bold text-white text-lg">{b.title}</p>}
                      {b.subtitle && <p className="text-sm text-white/85">{b.subtitle}</p>}
                      {b.cta_label && (
                        <span className="mt-2 inline-block text-xs font-bold text-bansal-orange">{b.cta_label} →</span>
                      )}
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="rounded-2xl border border-border bg-bansal-cream p-6 md:p-8">
            <h2 className="font-display text-2xl font-bold text-bansal-black">Admission Enquiry — {centerCity}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Share your details and the centre team will reach out within 24 hours.
            </p>
            <button
              onClick={() => setAdmissionOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-bansal-orange px-5 py-3 text-sm font-bold text-white hover:opacity-90"
            >
              <Send className="h-4 w-4" /> Open enquiry form
            </button>
          </div>
        </div>
      </section>

      {admissionOpen && (
        <AdmissionEnquiryModal centerId={centerId} centerCity={centerCity} onClose={() => setAdmissionOpen(false)} />
      )}
    </>
  );
};

const ENQUIRY_TYPES = [
  { value: "course", label: "Course" },
  { value: "admission", label: "Admission" },
  { value: "general", label: "General" },
];
import { CLASS_LEVELS } from "@/lib/constants";
const CLASS_LEVELS_OPTIONS = [...CLASS_LEVELS];

export const AdmissionEnquiryModal = ({
  centerId,
  centerCity,
  onClose,
}: {
  centerId: string;
  centerCity: string;
  onClose: () => void;
}) => {
  const [form, setForm] = useState({ name: "", phone: "", enquiry_type: "admission", class_level: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.phone.trim()) return toast.error("Name and phone are required");
    if (!isValidIndianPhone(form.phone)) return toast.error("Enter a valid 10-digit mobile number");
    if (!form.enquiry_type) return toast.error("Please choose an enquiry type");
    setSubmitting(true);
    const { error } = await (supabase as any).from("enquiries").insert({
      name: form.name,
      email: null,
      phone: form.phone,
      message: form.message || `${form.enquiry_type} enquiry`,
      source: "admission",
      source_type: "admission",
      centre_id: centerId,
      category: form.enquiry_type,
      class_level: form.class_level || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Enquiry sent! The centre will reach out soon.");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-display text-lg font-bold text-bansal-black">Admission Enquiry — {centerCity}</h3>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Full name"
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
        />
        <input
          type="tel"
          inputMode="numeric"
          pattern="[6-9][0-9]{9}"
          maxLength={10}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
          placeholder="10-digit mobile"
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
        />
        <select
          value={form.enquiry_type}
          onChange={(e) => setForm({ ...form, enquiry_type: e.target.value })}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
        >
          <option value="">Enquiry type</option>
          {ENQUIRY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={form.class_level}
          onChange={(e) => setForm({ ...form, class_level: e.target.value })}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
        >
          <option value="">Class</option>
          {CLASS_LEVELS_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Tell us about your goal (e.g. JEE 2026, Class 11)"
          rows={4}
          className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
        />
        <button
          onClick={submit}
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-bansal-orange py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send enquiry
        </button>
      </div>
    </div>
  );
};

export default CenterOfflineSections;
