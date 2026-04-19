import {
  Briefcase,
  BookOpen,
  Users,
  Rocket,
  GraduationCap,
  ArrowRight,
  Phone,
  Sparkles,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EducatorApplicationDialog from "@/components/EducatorApplicationDialog";
import arkeLogo from "@/assets/arke-logo.jpeg";

const openings = [
  { subject: "Physics", classes: "Class 8 – 10" },
  { subject: "Chemistry", classes: "Class 8 – 10" },
  { subject: "Biology", classes: "Class 8 – 10" },
  { subject: "Mathematics", classes: "Class 8 – 10" },
  { subject: "Science", classes: "Class 8 – 10" },
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
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-3">
          <img
            src={arkeLogo}
            alt="ARKE"
            className="h-12 sm:h-14 w-auto object-contain shrink-0"
          />
          <a
            href="tel:+917597514217"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary transition-colors shrink-0"
            aria-label="Call ARKE"
          >
            <Phone className="h-4 w-4" />
            <span className="hidden sm:inline">+91 7597 514 217</span>
            <span className="sm:hidden">Call</span>
          </a>
        </div>
      </header>

      {/* SECTION 1 — Application / Current Openings */}
      <section className="relative overflow-hidden">
        {/* Decorative gradient blobs */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        <div
          aria-hidden
          className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl -z-10"
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-secondary/20 blur-3xl -z-10"
        />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-20 lg:py-24">
          <div className="text-center">
            <Badge className="mb-3 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 text-xs sm:text-sm">
              <Briefcase className="h-3.5 w-3.5 mr-1.5" />
              We're Hiring Educators
            </Badge>
            <div className="mb-4 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/10 px-3 py-1 text-[11px] sm:text-xs font-semibold text-secondary-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Led by Kota's Top Educators · Kota, Rajasthan
              </span>
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              Apply to Teach at <span className="text-primary">ARKE</span>
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
              Join our founding team of educators from <span className="font-semibold text-foreground">Kota</span>. We're looking for passionate teachers for{" "}
              <span className="font-semibold text-foreground">Class 8th to 10th</span>.
            </p>
          </div>

          {/* Openings */}
          <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {openings.map((o) => (
              <div
                key={o.subject}
                className="group relative rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/40 transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {o.classes}
                  </span>
                </div>
                <div className="font-heading text-lg sm:text-xl font-bold leading-snug">
                  {o.subject}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-8 sm:mt-12 flex flex-col items-center gap-3">
            <EducatorApplicationDialog
              trigger={
                <Button
                  size="lg"
                  className="w-full sm:w-auto h-13 sm:h-14 px-8 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
                >
                  Apply Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              }
            />
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Takes ~3 minutes · Reviewed within 48 hours
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2 — What is Arke */}
      <section className="py-12 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold">
              What is <span className="text-primary">ARKE</span>?
            </h2>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
              ARKE is a next-generation learning platform for India and Dubai — led by{" "}
              <span className="font-semibold text-foreground">Kota's top educators</span> and built
              to make world-class education accessible, engaging, and outcome-driven for every student.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-card p-5 sm:p-6 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <h3 className="font-heading text-lg sm:text-xl font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 sm:py-8 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src={arkeLogo} alt="ARKE" className="h-8 sm:h-9 w-auto object-contain" />
            <span>© {new Date().getFullYear()} ARKE. All rights reserved.</span>
          </div>
          <a
            href="tel:+917597514217"
            className="inline-flex items-center gap-2 hover:text-primary transition-colors font-medium"
          >
            <Phone className="h-4 w-4" />
            +91 7597 514 217
          </a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
