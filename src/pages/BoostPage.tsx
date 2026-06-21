import { useState } from "react";
import { Trophy, Award, GraduationCap, Calendar, IndianRupee, Clock, CheckCircle2, Sparkles, BookOpen, Users } from "lucide-react";
import BansalButton from "@/components/bansal/BansalButton";
import BansalCard from "@/components/bansal/BansalCard";
import BansalBadge from "@/components/bansal/BansalBadge";
import boostHeroAsset from "@/assets/boost-hero-banner.png.asset.json";
const boostHero = boostHeroAsset.url;
import { FloatingIcons, DotTexture } from "@/components/bansal/BansalDecor";
import BoostRegistrationModal from "@/components/BoostRegistrationModal";

const benefits = [
  { icon: Trophy, title: "Up to 90% Scholarship", desc: "Win huge fee waivers on Bansal Classes JEE/NEET/Foundation programs based on your rank." },
  { icon: Award, title: "Cash Prizes", desc: "Top performers across categories receive cash rewards and Bansal Achiever certificates." },
  { icon: GraduationCap, title: "Personal Mentorship", desc: "Top 100 rankers get a one-on-one mentor session with Bansal senior faculty." },
  { icon: Sparkles, title: "Free Study Material", desc: "All registrants receive a Bansal Foundation booklet and exclusive practice sheets." },
];

const eligibility = [
  { category: "Class 5–9", target: "Pre-Foundation (NTSE, Olympiads)" },
  { category: "Class 10", target: "Foundation + JEE/NEET Prep" },
  { category: "Class 11", target: "JEE Main, JEE Advanced, NEET" },
  { category: "Class 12", target: "JEE Main, JEE Advanced, NEET" },
  { category: "Class 12 Pass", target: "Repeater / Droppers Batch" },
];

const pattern = [
  { mode: "Online", duration: "60 min", questions: "40 MCQs", subjects: "Physics, Chemistry, Maths / Biology, Mental Ability" },
  { mode: "Offline (Centre)", duration: "90 min", questions: "60 MCQs", subjects: "Physics, Chemistry, Maths / Biology, Mental Ability" },
];

const timeline = [
  { phase: "Registration", date: "Open Now", desc: "Pay ₹99 and reserve your slot on bansal.ac.in" },
  { phase: "Admit Card", date: "T-3 days", desc: "Download your admit card from the official portal" },
  { phase: "Test Day", date: "Every Sunday", desc: "Online slots and offline center slots available" },
  { phase: "Result", date: "Within 48 hrs", desc: "Scholarship + counselling call from Bansal admissions" },
];

const faqs = [
  { q: "Who can appear for BOOST?", a: "Any student from Class 5 to Class 12 (and droppers) preparing for school, NTSE, Olympiads, JEE, or NEET can register." },
  { q: "Is BOOST really only ₹99?", a: "Yes. The registration fee is ₹99 — non-refundable, covers test administration and study material kit." },
  { q: "Can I take the test from home?", a: "Yes, the online mode is fully proctored. You can also choose an offline slot at a nearby Bansal center." },
  { q: "How is the scholarship applied?", a: "Your scholarship percentage is auto-applied to your Bansal Classes course fee at the time of admission." },
];

export default function BoostPage() {
  const [regOpen, setRegOpen] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <BoostRegistrationModal open={regOpen} onClose={() => setRegOpen(false)} />
      {/* Hero */}
      <section className="bg-bansal-blue text-white py-16 md:py-24 relative overflow-hidden">
        <img src={boostHero} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-br from-bansal-blue/85 via-bansal-blue/80 to-bansal-blue-dark/90" />
        <div className="absolute inset-0 bg-gradient-to-br from-bansal-blue via-bansal-blue-dark to-bansal-blue opacity-95" />
        <FloatingIcons defaultTone="white" />
        <DotTexture tone="white" className="opacity-25 decor-fade" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl">
            <BansalBadge variant="orange" className="mb-5">Bansal Flagship Scholarship Test</BansalBadge>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-5">
              BOOST <span className="text-bansal-orange">Scholarship Test</span>
            </h1>
            <p className="text-lg md:text-xl text-white/85 mb-8 max-w-2xl leading-relaxed">
              Win up to <span className="text-bansal-orange font-bold">90% scholarship</span> on India's most trusted JEE / NEET coaching at Bansal Classes, Kota. Just <span className="font-bold">₹99</span> to register.
            </p>
            <div className="flex flex-wrap gap-3">
              <BansalButton variant="cta" className="text-base px-8 py-4" onClick={() => setRegOpen(true)}>
                Register for ₹99
              </BansalButton>
              <a href="#how-it-works">
                <BansalButton variant="ghost-white" className="text-base px-8 py-4">
                  How it works
                </BansalButton>
              </a>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-xl">
              {[
                { v: "90%", l: "Max Scholarship" },
                { v: "₹99", l: "Reg. Fee" },
                { v: "10K+", l: "Students/Year" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display text-3xl md:text-4xl font-bold text-bansal-orange">{s.v}</div>
                  <div className="text-sm text-white/70 mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <BansalBadge variant="blue" className="mb-3">Why BOOST</BansalBadge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black">
              Rewards Worth the Hustle
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <BansalCard key={b.title}>
                <div className="h-12 w-12 rounded-lg bg-bansal-orange/10 text-bansal-orange flex items-center justify-center mb-4">
                  <b.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-bold text-bansal-black mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* Eligibility */}
      <section className="py-16 md:py-20 bg-bansal-cream">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <BansalBadge variant="blue" className="mb-3">Eligibility</BansalBadge>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black mb-4">
                Open to Every Serious Aspirant
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Whether you're starting your foundation in Class 6 or fine-tuning for your final JEE / NEET attempt — BOOST has a track for you.
              </p>
              <ul className="space-y-3">
                {[
                  "Open to Class 5 through Class 12 + droppers",
                  "Both online and offline modes available",
                  "Single ₹99 fee — no hidden charges",
                  "Test material kit shipped to every registrant",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2 text-bansal-black">
                    <CheckCircle2 className="h-5 w-5 text-bansal-orange shrink-0 mt-0.5" />
                    <span className="text-sm">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <BansalCard className="p-0 overflow-hidden">
              <div className="bg-bansal-blue text-white px-6 py-4">
                <div className="flex items-center gap-2 font-semibold">
                  <Users className="h-5 w-5 text-bansal-orange" />
                  Class &amp; Target Exam
                </div>
              </div>
              <div className="divide-y divide-border">
                {eligibility.map((e) => (
                  <div key={e.category} className="flex items-center justify-between px-6 py-4">
                    <span className="font-semibold text-bansal-black">{e.category}</span>
                    <span className="text-sm text-muted-foreground text-right">{e.target}</span>
                  </div>
                ))}
              </div>
            </BansalCard>
          </div>
        </div>
      </section>

      {/* Pattern */}
      <section id="how-it-works" className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <BansalBadge variant="blue" className="mb-3">Test Pattern</BansalBadge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black">
              Simple. Transparent. Online or Offline.
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {pattern.map((p) => (
              <BansalCard key={p.mode}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-bansal-blue text-white flex items-center justify-center">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-bansal-black">{p.mode}</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-semibold text-bansal-black">{p.duration}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Questions</span><span className="font-semibold text-bansal-black">{p.questions}</span></div>
                  <div>
                    <div className="text-muted-foreground mb-1">Subjects</div>
                    <div className="font-semibold text-bansal-black">{p.subjects}</div>
                  </div>
                </div>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 md:py-20 bg-bansal-cream">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <BansalBadge variant="blue" className="mb-3">Timeline</BansalBadge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black">
              From Registration to Scholarship
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {timeline.map((t, i) => (
              <BansalCard key={t.phase} className="relative">
                <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-bansal-orange text-white font-bold flex items-center justify-center text-sm shadow-md">
                  {i + 1}
                </div>
                <Calendar className="h-5 w-5 text-bansal-blue mb-3" />
                <h3 className="font-display font-bold text-bansal-black">{t.phase}</h3>
                <p className="text-bansal-orange text-xs font-bold uppercase tracking-wide mt-1">{t.date}</p>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{t.desc}</p>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-10">
            <BansalBadge variant="blue" className="mb-3">FAQs</BansalBadge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black">
              Common Questions
            </h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f) => (
              <BansalCard key={f.q} className="hover-lift">
                <h3 className="font-display font-bold text-bansal-black mb-2">{f.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20 bg-bansal-blue text-white">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <IndianRupee className="h-12 w-12 text-bansal-orange mx-auto mb-4" />
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
            Your future called — at just ₹99.
          </h2>
          <p className="text-white/80 mb-7">
            Register on the official Bansal Classes portal and lock in your BOOST slot today.
          </p>
          <BansalButton variant="cta" className="text-base px-10 py-4" onClick={() => setRegOpen(true)}>
            Register for ₹99
          </BansalButton>
          <p className="mt-4 text-xs text-white/60 flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" /> Limited slots every Sunday
          </p>
        </div>
      </section>
    </div>
  );
}
