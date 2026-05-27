import { useState } from "react";
import { z } from "zod";
import { Briefcase, GraduationCap, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import BansalButton from "@/components/bansal/BansalButton";
import BansalCard from "@/components/bansal/BansalCard";
import BansalBadge from "@/components/bansal/BansalBadge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const applicationSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(7, "Valid phone required").max(20),
  position: z.string().min(1, "Select a position"),
  subject: z.string().max(60).optional(),
  experience: z.string().max(20).optional(),
  message: z.string().trim().min(10, "Tell us a bit about yourself").max(1500),
});

const positions = [
  { value: "academic-senior", label: "Academic — Senior Faculty (Experienced)" },
  { value: "academic-neev", label: "Academic — NEEV (VI to X)" },
  { value: "non-academic", label: "Non-Academic Positions" },
  { value: "bftp", label: "BFTP — Bansal Faculty Training Program" },
];

const subjects = ["Physics", "Chemistry (Organic)", "Chemistry (Inorganic)", "Chemistry (Physical)", "Mathematics", "Biology", "Other"];

const CareerPage = () => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", position: "", subject: "", experience: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = applicationSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Please check your details", description: parsed.error.issues[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const messageBody = [
      `[Career Application — ${form.position}]`,
      form.subject ? `Subject: ${form.subject}` : null,
      form.experience ? `Experience: ${form.experience} years` : null,
      "",
      form.message,
    ].filter(Boolean).join("\n");

    const { error } = await supabase.from("enquiries").insert({
      name: form.name,
      email: form.email,
      phone: form.phone,
      message: messageBody,
      source: "other",
      region: "india",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
      return;
    }
    setDone(true);
    toast({ title: "Application received", description: "Our HR team will reach out shortly." });
  };

  const positionGroups = [
    { icon: GraduationCap, title: "Academic Positions (Senior)", desc: "Experienced faculty for Physics, Chemistry, Mathematics, Biology." },
    { icon: Users, title: "Academic Positions (NEEV VI–X)", desc: "Foundation faculty mentoring future JEE/NEET aspirants." },
    { icon: Briefcase, title: "Non-Academic Positions", desc: "Operations, admissions, HR, technology and student support roles." },
  ];

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-bansal-blue to-bansal-blue-dark text-white py-16 md:py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <BansalBadge tone="orange" className="mb-4">Career — Opportunities at Bansal Classes</BansalBadge>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold mb-4">Where Passion Meets Profession</h1>
          <p className="text-white/85 text-lg">
            Join Bansal Classes — the initiator of the coaching industry in Kota — for great culture, pay and growth.
          </p>
        </div>
      </section>

      {/* BFTP */}
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <BansalCard className="bg-gradient-to-r from-bansal-orange/10 to-bansal-blue/5 border-l-4 border-bansal-orange">
            <BansalBadge tone="orange" className="mb-2">BFTP</BansalBadge>
            <h2 className="font-display text-2xl font-bold text-bansal-blue">Bansal Faculty Training Program</h2>
            <p className="text-sm text-bansal-gray mt-2">
              A flagship program to identify, train and onboard the next generation of Bansal educators in Physics, Chemistry, Mathematics and Biology.
            </p>
            <p className="text-xs text-bansal-gray mt-2"><strong>Test date:</strong> To be announced</p>
          </BansalCard>
        </div>
      </section>

      {/* Why */}
      <section className="py-12 bg-bansal-cream">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="font-display text-3xl font-bold text-bansal-blue mb-2 text-center">Why Choose Bansal</h2>
          <p className="text-bansal-gray text-center max-w-2xl mx-auto mb-8">
            We are passionate about education and the impact it has on individuals and communities. Join us in our mission to inspire, educate and empower the next generation.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {positionGroups.map((p) => (
              <BansalCard key={p.title}>
                <p.icon className="h-8 w-8 text-bansal-orange mb-3" />
                <h3 className="font-display text-lg font-bold text-bansal-blue mb-2">{p.title}</h3>
                <p className="text-sm text-bansal-gray">{p.desc}</p>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* Application form */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold text-bansal-blue">Online Application Form</h2>
            <p className="text-bansal-gray mt-2">Tell us about yourself — we'll get back within 5–7 working days.</p>
          </div>

          {done ? (
            <BansalCard className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-bansal-orange mx-auto mb-4" />
              <h3 className="font-display text-xl font-bold text-bansal-blue mb-2">Application received</h3>
              <p className="text-bansal-gray text-sm">Thank you for applying to Bansal Classes. Our HR team will reach out shortly at <strong>{form.email}</strong>.</p>
            </BansalCard>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 bg-white p-8 rounded-xl border border-border shadow-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Full name *</Label>
                  <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="phone">Phone *</Label>
                  <Input id="phone" type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <div>
                <Label>Applying for *</Label>
                <Select value={form.position} onValueChange={(v) => setForm({ ...form, position: v })}>
                  <SelectTrigger><SelectValue placeholder="Select a position" /></SelectTrigger>
                  <SelectContent>
                    {positions.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Subject (if academic)</Label>
                  <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}>
                    <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="exp">Experience (years)</Label>
                  <Input id="exp" type="number" min="0" max="50" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
                </div>
              </div>

              <div>
                <Label htmlFor="msg">About you *</Label>
                <Textarea id="msg" rows={5} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us about your background, achievements and why you'd be a great fit." />
              </div>

              <BansalButton type="submit" variant="cta" disabled={submitting} className="w-full">
                {submitting ? "Submitting..." : <>Submit Application <ArrowRight className="h-4 w-4" /></>}
              </BansalButton>
              <p className="text-xs text-bansal-gray text-center">HR enquiries: +91 8375015384 · BFTP: +91 8003046222</p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};

export default CareerPage;
