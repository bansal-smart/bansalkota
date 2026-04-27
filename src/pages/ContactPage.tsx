import { useState } from "react";
import { Mail, Phone, MapPin, MessageCircle, Send, Clock, Globe, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ContactPage = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    toast({ title: "Message sent!", description: "We'll get back to you within 24 hours." });
    setForm({ name: "", email: "", subject: "", message: "" });
    setTimeout(() => setSubmitted(false), 4000);
  };

  const offices = [
    {
      flag: "🇮🇳",
      city: "New Delhi, India",
      address: "Connaught Place, New Delhi 110001",
      phone: "+91 98765 43210",
      hours: "Mon–Sat · 9:00 AM – 8:00 PM IST",
    },
    {
      flag: "🇦🇪",
      city: "Dubai, UAE",
      address: "Business Bay, Dubai",
      phone: "+971 50 123 4567",
      hours: "Sun–Thu · 9:00 AM – 7:00 PM GST",
    },
  ];

  const channels = [
    { icon: Mail, label: "Email Support", value: "support@arke.pro", href: "mailto:support@arke.pro" },
    { icon: MessageCircle, label: "WhatsApp", value: "+91 98765 43210", href: "https://wa.me/919876543210" },
    { icon: Phone, label: "Call Us", value: "+91 98765 43210", href: "tel:+919876543210" },
  ];

  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary/10 via-background to-accent/10 py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-pill border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-bold text-primary mb-6">
            <MessageCircle className="h-3.5 w-3.5" /> We're here to help
          </div>
          <h1 className="text-4xl md:text-6xl font-black font-display gradient-text mb-6">Get in touch</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Questions about courses, enrollment, careers, or partnerships? We typically reply within 24 hours.
          </p>
        </div>
      </section>

      {/* Quick channels */}
      <section className="py-12">
        <div className="container mx-auto px-4 grid md:grid-cols-3 gap-4">
          {channels.map((c) => (
            <a
              key={c.label}
              href={c.href}
              className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition-colors"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                <c.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{c.label}</div>
                <div className="font-bold">{c.value}</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Form + offices */}
      <section className="py-12">
        <div className="container mx-auto px-4 grid md:grid-cols-5 gap-8">
          {/* Form */}
          <div className="md:col-span-3 rounded-3xl border border-border bg-card p-8">
            <h2 className="text-2xl font-black font-display mb-2">Send us a message</h2>
            <p className="text-sm text-muted-foreground mb-6">Fill the form and our team will reach out shortly.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                    placeholder="Aarav Sharma"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                    placeholder="you@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Subject</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  placeholder="How can we help?"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">Message *</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={5}
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none resize-none"
                  placeholder="Tell us a bit about what you're looking for..."
                />
              </div>
              <button
                type="submit"
                disabled={submitted}
                className="inline-flex items-center gap-2 rounded-pill bg-gradient-to-r from-primary to-accent px-8 py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitted ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Sent
                  </>
                ) : (
                  <>
                    Send Message <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Offices */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-primary" />
              <h3 className="font-bold uppercase text-xs tracking-wider text-muted-foreground">Our Offices</h3>
            </div>
            {offices.map((o) => (
              <div key={o.city} className="rounded-2xl border border-border bg-card p-6">
                <div className="text-3xl mb-3">{o.flag}</div>
                <h4 className="font-black text-lg mb-3">{o.city}</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex gap-2"><MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" /> {o.address}</div>
                  <div className="flex gap-2"><Phone className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" /> {o.phone}</div>
                  <div className="flex gap-2"><Clock className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" /> {o.hours}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
