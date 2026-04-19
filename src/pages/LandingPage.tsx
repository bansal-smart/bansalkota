import { Briefcase, BookOpen, Users, Rocket, GraduationCap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EducatorApplicationDialog from "@/components/EducatorApplicationDialog";
import arkeLogo from "@/assets/arke-logo.jpeg";

const openings = [
  { subject: "Mathematics", classes: "Class 8 – 10" },
  { subject: "Science", classes: "Class 8 – 10" },
  { subject: "PCMB (Physics · Chemistry · Maths · Biology)", classes: "Class 8 – 10" },
];

const features = [
  {
    icon: BookOpen,
    title: "Smart Live Classes",
    desc: "Interactive, high-engagement live sessions designed for deep understanding — not just lectures.",
  },
  {
    icon: Users,
    title: "Expert Educators",
    desc: "Hand-picked teachers mentoring students with personalized attention.",
  },
  {
    icon: Rocket,
    title: "Built for Outcomes",
    desc: "Adaptive tests, AI doubt solving, and structured learning paths that drive real results.",
  },
];

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Bar */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center gap-3">
          <img src={arkeLogo} alt="Arke" className="h-10 w-10 rounded-lg object-cover" />
          <div>
            <div className="font-heading text-xl font-bold leading-none">Arke</div>
            <div className="text-xs text-muted-foreground">Inspiring Excellence</div>
          </div>
        </div>
      </header>

      {/* SECTION 1 — Application / Current Openings (header) */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-16 sm:py-24">
          <div className="text-center">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
              <Briefcase className="h-3.5 w-3.5 mr-1.5" />
              We're Hiring Educators
            </Badge>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Apply to Teach at <span className="text-primary">Arke</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Join our founding team of educators. We're looking for passionate teachers for
              <span className="font-semibold text-foreground"> Class 8th to 10th</span>.
            </p>
          </div>

          {/* Openings */}
          <div className="mt-10 grid sm:grid-cols-3 gap-4">
            {openings.map((o) => (
              <div
                key={o.subject}
                className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {o.classes}
                  </span>
                </div>
                <div className="font-heading text-lg font-semibold leading-snug">{o.subject}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-10 flex justify-center">
            <EducatorApplicationDialog
              trigger={
                <Button size="lg" className="h-14 px-8 text-base font-semibold shadow-lg">
                  Apply Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              }
            />
          </div>
        </div>
      </section>

      {/* SECTION 2 — What is Arke */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold">What is Arke?</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Arke is a next-generation learning platform for India and Dubai — built to make
              world-class education accessible, engaging, and outcome-driven for every student.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-6 hover:border-primary/40 transition-colors"
              >
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Arke. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
