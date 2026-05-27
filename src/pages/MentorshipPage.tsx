import { Link } from "react-router-dom";
import {
  GraduationCap,
  Briefcase,
  Stethoscope,
  Sparkles,
  AlertTriangle,
  Compass,
  Video,
  CalendarClock,
  ArrowRight,
  UserPlus,
  UsersRound,
  CheckCircle2,
  Trophy,
} from "lucide-react";

const iitBadges = [
  "IIT Delhi",
  "IIT Bombay",
  "IIT Kharagpur",
  "IIT Madras",
  "IIT Kanpur",
  "IIT Roorkee",
  "IIM Ahmedabad",
  "AIIMS Delhi",
];

const builders = [
  {
    icon: GraduationCap,
    title: "Engineered by IITians",
    body: "Every module, test engine and learning algorithm is built by IIT graduates who have lived the grind.",
  },
  {
    icon: Briefcase,
    title: "Designed by IIMians",
    body: "The pedagogy, learning paths and student experience are crafted by IIM alumni focused on outcomes.",
  },
  {
    icon: Stethoscope,
    title: "Guided by AIIMS doctors",
    body: "NEET prep is led by AIIMS medicos who understand the discipline a future doctor needs.",
  },
];

const steps = [
  { icon: UserPlus, title: "Enroll", body: "Join Bansal Classes and tell us your goal." },
  { icon: UsersRound, title: "Get matched", body: "We pair you with an IITian mentor in your stream." },
  { icon: Video, title: "Meet every 15 days", body: "Direct Google Meet 1:1 with your mentor." },
  { icon: CheckCircle2, title: "Stay on track", body: "Resolve illusions, refine strategy, keep moving." },
];

const MentorshipPage = () => {
  return (
    <div className="bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--navy))] via-[hsl(var(--navy2))] to-[hsl(222,47%,15%)] py-20 md:py-28">
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: "radial-gradient(circle at 30% 50%, hsl(24 95% 53% / 0.25) 0%, transparent 60%)" }}
        />
        <div className="container relative z-10 mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-pill border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" /> 1:1 Mentorship Program
            </span>
            <h1 className="mt-6 font-display text-4xl font-black text-white md:text-5xl lg:text-6xl">
              Mentorship by <span className="gradient-text">IITians, IIMians & AIIMS doctors</span>
            </h1>
            <p className="mt-5 text-lg text-white/80">
              Bansal Classes is programmed and designed directly by toppers from IIT, IIM and AIIMS. The mentorship you get here
              comes straight from IITians currently studying at IIT Delhi, Bombay, Kharagpur and other premier IITs.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {iitBadges.map((b) => (
                <span
                  key={b}
                  className="rounded-pill border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white/90"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Built by toppers */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-black text-foreground md:text-4xl">
              Built by toppers, for toppers
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Not a generic EdTech. Every part of Bansal Classes — code, content, mentorship — is crafted by people who have
              cleared the toughest exams in India.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {builders.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="mt-5 font-display text-xl font-bold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Illusions section */}
      <section className="bg-[hsl(var(--navy))] py-20 text-white">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-pill border border-destructive/40 bg-destructive/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-destructive-foreground">
                <AlertTriangle className="h-3.5 w-3.5" /> The biggest problem
              </span>
              <h2 className="mt-5 font-display text-3xl font-black md:text-4xl">
                Most aspirants don&apos;t fail because of syllabus.
                <br />
                They fail because of <span className="gradient-text">illusions.</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-white/75">
                Wrong shortcuts. False confidence. Misleading toppers&apos; advice on the internet. Endless coaching
                drama. These illusions silently eat away months of preparation.
              </p>
              <p className="mt-3 text-base leading-relaxed text-white/75">
                Our IITian mentors break these illusions in your very first session — because they walked the same path
                two or three years ago.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                  <Compass className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl font-bold">Mentorship dissolves illusions</h3>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-white/85">
                {[
                  "Honest weekly direction instead of internet noise",
                  "Strategy reviews from someone who cleared JEE / NEET recently",
                  "Clarity on what to skip — not just what to study",
                  "Real talk about burnout, motivation and self-doubt",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Fortnightly Google Meet */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
            <div className="relative rounded-3xl border border-border bg-card p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                  <Video className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Every 15 days</p>
                  <p className="font-display text-lg font-bold text-foreground">Google Meet · 1:1</p>
                </div>
              </div>
              <div className="mt-6 space-y-3 text-sm text-foreground">
                <div className="flex items-start gap-2">
                  <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
                  <span>Scheduled fortnightly with your assigned IITian mentor.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  <span>Non-academic queries: motivation, time management, family pressure, college life.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  <span>Strategy check-ins: are you on track, what to fix in the next 15 days.</span>
                </div>
              </div>
            </div>
            <div>
              <h2 className="font-display text-3xl font-black text-foreground md:text-4xl">
                Talk to a real IITian — every fortnight, on Google Meet
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                Beyond academics, every Bansal Classes student gets a direct Google Meet call with their IITian mentor every 15
                days. Use it to clear non-academic queries, calibrate your strategy and stay aligned with your goal.
              </p>
              <Link
                to="/signup"
                className="mt-6 inline-flex items-center gap-2 rounded-pill bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-bold text-primary-foreground shadow-blue transition-opacity hover:opacity-90"
              >
                Book Your Mentor <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-card py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-black text-foreground md:text-4xl">How mentorship works</h2>
            <p className="mt-3 text-base text-muted-foreground">Four simple steps to your IITian mentor.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {steps.map(({ icon: Icon, title, body }, i) => (
              <div
                key={title}
                className="relative rounded-2xl border border-border bg-background p-6 text-center shadow-sm"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary to-accent px-3 py-0.5 text-[10px] font-black text-primary-foreground">
                  STEP {i + 1}
                </div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl rounded-3xl bg-gradient-to-br from-primary to-accent p-10 text-center text-primary-foreground shadow-blue">
            <Trophy className="mx-auto h-10 w-10" />
            <h2 className="mt-4 font-display text-3xl font-black md:text-4xl">Get your IITian mentor today</h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-primary-foreground/90">
              Stop guessing your way through preparation. Start learning from someone who actually made it.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-pill bg-white px-7 py-3 text-sm font-bold text-primary transition-transform hover:scale-105"
              >
                Book Your Mentor <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-pill border border-white/40 px-7 py-3 text-sm font-bold text-white hover:bg-white/10"
              >
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MentorshipPage;
