import { useEffect, useState } from "react";
import { Sparkles, BookOpen, Users, Rocket, GraduationCap, MapPin, Mail, ArrowRight, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EducatorApplicationDialog from "@/components/EducatorApplicationDialog";
import arkeLogo from "@/assets/arke-logo.jpeg";

const features = [
  {
    icon: BookOpen,
    title: "Smart Live Classes",
    desc: "Interactive, high-engagement live sessions designed for deep understanding — not just lectures.",
  },
  {
    icon: Users,
    title: "Expert Educators",
    desc: "Hand-picked teachers from top institutions, mentoring students with personalized attention.",
  },
  {
    icon: Rocket,
    title: "Built for Outcomes",
    desc: "Adaptive tests, AI doubt solving, and structured learning paths that drive real results.",
  },
];

const openings = [
  { subject: "Mathematics", classes: "Class 8 – 10", color: "from-primary to-accent" },
  { subject: "Science", classes: "Class 8 – 10", color: "from-secondary to-primary" },
  { subject: "PCMB (Physics · Chemistry · Maths · Biology)", classes: "Class 8 – 10", color: "from-accent to-secondary" },
];

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Bar */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all ${
          scrolled ? "bg-background/85 backdrop-blur-md border-b border-border shadow-sm" : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={arkeLogo} alt="Arke logo" className="h-10 w-10 rounded-lg object-cover shadow-sm" />
            <div className="leading-tight">
              <p className="font-display font-black text-lg tracking-tight text-foreground">ARKE</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Inspiring Excellence</p>
            </div>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex bg-primary/10 border-primary/30 text-primary font-semibold">
            <Sparkles className="h-3 w-3" /> Launching Soon
          </Badge>
        </div>
      </header>

      <main className="pt-24">
        {/* Hero — Coming Soon */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
            <div className="absolute -top-40 -right-32 h-96 w-96 rounded-full bg-primary/30 blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-secondary/25 blur-3xl animate-pulse [animation-delay:1.5s]" />
          </div>

          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20 sm:py-28 text-center">
            <Badge className="mb-6 bg-primary/15 text-primary border-primary/30 hover:bg-primary/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
              <Sparkles className="h-3 w-3" /> Coming Soon
            </Badge>

            <h1 className="font-display font-black text-5xl sm:text-7xl lg:text-8xl leading-[0.95] tracking-tight">
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Arke
              </span>
              <br />
              <span className="text-foreground">is launching soon.</span>
            </h1>

            <p className="mt-8 mx-auto max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
              India &amp; Dubai's next-generation learning platform — built to inspire excellence in every student
              through expert teaching, smart technology, and personalized care.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <a href="#openings">
                <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-95 shadow-lg shadow-primary/30 px-8 h-12 text-base font-bold">
                  <Briefcase className="h-5 w-5" /> View Current Openings
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <a href="#about">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base font-semibold border-2">
                  Learn About Arke
                </Button>
              </a>
            </div>

            <div className="mt-12 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> India</span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> Dubai</span>
            </div>
          </div>
        </section>

        {/* About — What is Arke */}
        <section id="about" className="py-20 sm:py-28 bg-card/50 border-y border-border">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary font-semibold">
                What is Arke?
              </Badge>
              <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tight text-foreground">
                A learning platform built around <span className="text-primary">students</span>, not screens.
              </h2>
              <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed">
                Arke combines the warmth of great teachers with the power of modern technology — delivering
                live classes, smart practice, and one-on-one mentorship to students preparing for school exams,
                competitive tests, and beyond.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="group relative rounded-2xl border border-border bg-background p-7 hover:shadow-xl hover:-translate-y-1 transition-all"
                >
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 group-hover:from-primary group-hover:to-accent transition-colors">
                    <f.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <h3 className="font-display font-bold text-xl text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Current Openings */}
        <section id="openings" className="py-20 sm:py-28">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="text-center mb-12">
              <Badge className="mb-4 bg-secondary/15 text-secondary border-secondary/30 hover:bg-secondary/20 font-semibold">
                <Briefcase className="h-3 w-3" /> We're Hiring
              </Badge>
              <h2 className="font-display font-black text-3xl sm:text-5xl tracking-tight text-foreground">
                Join our founding team of <span className="text-primary">educators</span>.
              </h2>
              <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
                Be part of the team that shapes how India &amp; Dubai's next generation learns. Currently
                hiring for Class 8th – 10th.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 mb-10">
              {openings.map((o) => (
                <div
                  key={o.subject}
                  className="rounded-2xl border-2 border-border bg-card p-6 hover:border-primary/40 hover:shadow-lg transition-all"
                >
                  <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${o.color}`}>
                    <GraduationCap className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <p className="font-display font-bold text-lg text-foreground leading-snug">{o.subject}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{o.classes}</p>
                </div>
              ))}
            </div>

            {/* Apply CTA card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-accent to-primary p-8 sm:p-12 text-center shadow-2xl shadow-primary/30">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.2),_transparent_60%)]" />
              <div className="relative">
                <h3 className="font-display font-black text-2xl sm:text-4xl text-primary-foreground">
                  Ready to teach with Arke?
                </h3>
                <p className="mt-3 text-primary-foreground/90 max-w-xl mx-auto text-sm sm:text-base">
                  Submit your application today. Our team reviews every application personally and gets
                  back within 5–7 working days.
                </p>
                <div className="mt-7">
                  <EducatorApplicationDialog
                    trigger={
                      <Button
                        size="lg"
                        className="bg-background text-primary hover:bg-background/95 h-14 px-10 text-base font-black shadow-xl"
                      >
                        <Briefcase className="h-5 w-5" /> Apply Now
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/40 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={arkeLogo} alt="Arke logo" className="h-8 w-8 rounded-md object-cover" />
            <div>
              <p className="font-display font-black text-foreground">ARKE</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Inspiring Excellence</p>
            </div>
          </div>
          <a
            href="mailto:careers@arke.pro"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Mail className="h-4 w-4" /> careers@arke.pro
          </a>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Arke. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
