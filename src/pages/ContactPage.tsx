import { useState } from "react";
import { Mail, Phone, MapPin, MessageCircle, Send, CheckCircle2, Loader2, Clock } from "lucide-react";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BansalButton from "@/components/bansal/BansalButton";
import BansalCard from "@/components/bansal/BansalCard";
import BansalBadge from "@/components/bansal/BansalBadge";
import contactHeroAsset from "@/assets/contact-hero.webp.asset.json";
const contactHero = contactHeroAsset.url;
import { FloatingIcons, DotTexture, GlowBlob } from "@/components/bansal/BansalDecor";
import SubmissionSuccess from "@/components/SubmissionSuccess";
import { sendConfirmation } from "@/lib/sendConfirmation";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(7, "Phone is required").max(20),
  subject: z.string().trim().max(150).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Please share a few details").max(2000),
});

const CHANNELS = [
  { icon: Phone, label: "Admissions", value: "+91 9773343246", href: "tel:+919773343246" },
  { icon: Phone, label: "Admissions Alt.", value: "+91 8003045222", href: "tel:+918003045222" },
  { icon: Phone, label: "HR", value: "+91 8375015384", href: "tel:+918375015384" },
  { icon: Phone, label: "BFTP", value: "+91 8003046222", href: "tel:+918003046222" },
  { icon: Mail, label: "Email", value: "info@bansal.ac.in", href: "mailto:admin@bansal.ac.in" },
  { icon: MessageCircle, label: "WhatsApp", value: "Chat with us", href: "https://wa.me/919773343246" },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data: dup } = await supabase.rpc("enquiry_recently_submitted", {
        _email: parsed.data.email,
        _phone: parsed.data.phone,
      });
      if (dup) {
        toast({
          title: "We already have your enquiry",
          description: "Our team will reach out shortly. Please wait 24 hours before resubmitting.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }
      const { error } = await supabase.from("enquiries").insert({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        message: parsed.data.subject ? `[${parsed.data.subject}]\n\n${parsed.data.message}` : parsed.data.message,
        source: "contact",
        region: "India",
      });
      if (error) throw error;
      setSubmitted(true);
      void sendConfirmation({
        templateName: "enquiry-confirmation",
        recipientEmail: parsed.data.email,
        idempotencyKey: `enquiry-contact-${parsed.data.email}-${Date.now()}`,
        templateData: { name: parsed.data.name, source: "contact", message: parsed.data.message },
      });
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      toast({
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[hsl(var(--navy))] text-white py-14 md:py-20">
        <img
          src={contactHero}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--navy))]/85 via-[hsl(var(--navy2))]/75 to-[hsl(222,47%,15%)]/90" />
        <FloatingIcons defaultTone="white" />
        <DotTexture tone="white" className="opacity-30 decor-fade" />
        <div className="container relative z-10 mx-auto px-4 text-center max-w-3xl">
          <BansalBadge variant="orange" className="mb-4">
            Reach Us
          </BansalBadge>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            We're here to <span className="text-bansal-orange">guide you</span>.
          </h1>
          <p className="text-white/85 text-lg">
            Have questions about courses, admissions, BOOST, or careers? Drop us a message — a Bansal counsellor will
            respond within 24 hours.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Form */}
            <BansalCard className="lg:col-span-3 p-8">
              {submitted ? (
                <SubmissionSuccess
                  title="Thank you! Your message is on its way."
                  message="Our admissions team will call you within the next 24 hours. Please keep your phone handy."
                  onReset={() => setSubmitted(false)}
                  ctaLabel="Back to Home"
                />
              ) : (
                <>
                  <h2 className="font-display text-2xl font-bold text-bansal-black mb-1">Send us a message</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Fill the form and our admissions team will reach out.
                  </p>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-bansal-black uppercase tracking-wide">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="Your name"
                          maxLength={100}
                          required
                          className="mt-1 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-bansal-black focus:outline-none focus:ring-2 focus:ring-bansal-orange"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-bansal-black uppercase tracking-wide">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                          maxLength={20}
                          required
                          className="mt-1 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-bansal-black focus:outline-none focus:ring-2 focus:ring-bansal-orange"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-bansal-black uppercase tracking-wide">Email *</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@example.com"
                        maxLength={255}
                        required
                        className="mt-1 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-bansal-black focus:outline-none focus:ring-2 focus:ring-bansal-orange"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-bansal-black uppercase tracking-wide">Subject</label>
                      <select
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-bansal-black focus:outline-none focus:ring-2 focus:ring-bansal-orange"
                      >
                        <option value="">Select a topic</option>
                        <option value="JEE Admission">JEE Admission</option>
                        <option value="NEET Admission">NEET Admission</option>
                        <option value="Foundation (Class 5-10)">Foundation (Class 5-10)</option>
                        <option value="BOOST Scholarship">BOOST Scholarship</option>
                        <option value="Centre Visit">Centre Visit</option>
                        <option value="Careers">Careers</option>
                        <option value="General Enquiry">General Enquiry</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-bansal-black uppercase tracking-wide">
                        Message *
                      </label>
                      <textarea
                        rows={5}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder="Tell us about your goals, current class, target exam…"
                        maxLength={2000}
                        required
                        className="mt-1 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-bansal-black focus:outline-none focus:ring-2 focus:ring-bansal-orange resize-none"
                      />
                    </div>
                    <BansalButton type="submit" variant="cta" disabled={submitting} className="w-full">
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" /> Send Message
                        </>
                      )}
                    </BansalButton>
                    <p className="text-xs text-muted-foreground text-center">
                      By submitting, you agree to be contacted by Bansal Classes admissions team.
                    </p>
                  </form>
                </>
              )}
            </BansalCard>

            {/* Right column: channels + HQ */}
            <div className="lg:col-span-2 space-y-5">
              <BansalCard>
                <h3 className="font-display text-lg font-bold text-bansal-black mb-4">Direct Channels</h3>
                <div className="space-y-3">
                  {CHANNELS.map((c) => (
                    <a
                      key={c.label + c.value}
                      href={c.href}
                      target={c.href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg p-3 hover:bg-bansal-blue-light transition-colors group"
                    >
                      <div className="h-9 w-9 rounded-lg bg-bansal-blue-light text-bansal-blue flex items-center justify-center group-hover:bg-bansal-blue group-hover:text-white transition-colors">
                        <c.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">{c.label}</div>
                        <div className="text-sm font-semibold text-bansal-black truncate">{c.value}</div>
                      </div>
                    </a>
                  ))}
                </div>
              </BansalCard>

              <BansalCard>
                <h3 className="font-display text-lg font-bold text-bansal-black mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-bansal-orange" /> Kota Headquarters
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Bansal Tower, A-10, Road No. 1, IPIA, Kota-324005, Rajasthan, India
                </p>
                <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                  <Clock className="h-4 w-4 text-bansal-orange mt-0.5" />
                  <span>Mon–Sat · 9:00 AM – 7:00 PM IST</span>
                </div>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Bansal+Classes+Kota"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-4"
                >
                  <BansalButton variant="outline" className="w-full text-sm">
                    Open in Maps
                  </BansalButton>
                </a>
              </BansalCard>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
