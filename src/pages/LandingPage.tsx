import { Link } from "react-router-dom";
import { ArrowRight, Play, BookOpen, ClipboardCheck, Bot, BarChart3, Swords, Smartphone, Star, Check, Flame, Rocket, GraduationCap, FileText, Trophy, Users, Monitor, Award, Heart, Sparkles } from "lucide-react";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Flame className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-black font-display text-foreground">ARAMBH</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link to="/courses" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Courses</Link>
            <Link to="/tests" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Tests</Link>
            <Link to="/live-classes" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Live Classes</Link>
            <Link to="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-foreground hover:text-primary transition-colors">Login</Link>
            <Link to="/signup" className="rounded-pill bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-blue hover:bg-primary-dark transition-colors">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy grid-texture">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-pill bg-primary/20 px-4 py-1.5 text-sm font-semibold text-primary">
                <Rocket className="h-4 w-4" /> India's Rising EdTech Platform
              </span>
              <h1 className="mt-6 font-display">
                <span className="block text-4xl font-black text-card md:text-5xl lg:text-6xl">Start Your Journey,</span>
                <span className="block text-4xl font-black text-primary md:text-5xl lg:text-6xl">Reach Your Goals</span>
              </h1>
              <p className="mt-3 text-lg font-semibold text-muted">JEE · NEET · Board Exams | India & Dubai</p>
              <p className="mt-4 max-w-md text-muted-foreground">
                Master your exams with live classes from top educators, AI-powered doubt solving, and smart test analytics.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to="/signup" className="inline-flex items-center gap-2 rounded-pill bg-primary px-7 py-3 text-base font-bold text-primary-foreground shadow-blue hover:bg-primary-dark transition-all">
                  Start for Free <ArrowRight className="h-4 w-4" />
                </Link>
                <button className="inline-flex items-center gap-2 rounded-pill border border-muted px-6 py-3 text-base font-semibold text-card hover:bg-card/10 transition-colors">
                  <Play className="h-4 w-4" /> Watch Demo
                </button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5 font-semibold"><Users className="h-4 w-4 text-primary" /> 10,000+ Students</span>
                <span className="inline-flex items-center gap-1.5 font-semibold"><Monitor className="h-4 w-4 text-primary" /> 500+ Live Classes</span>
                <span className="inline-flex items-center gap-1.5 font-semibold"><Award className="h-4 w-4 text-primary" /> 99% Results</span>
              </div>
            </div>
            <div className="relative hidden md:block">
              {/* Phone mockup */}
              <div className="animate-float mx-auto w-72 rounded-[2.5rem] border-4 border-muted/20 bg-navy-light p-3 shadow-lg">
                <div className="rounded-[2rem] bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary-light flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">AV</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Arjun Verma</p>
                      <p className="text-[10px] text-muted-foreground">IIT JEE 2026</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-lg bg-primary-light p-3">
                      <p className="text-xs font-bold text-primary">99.2%ile</p>
                      <p className="text-[10px] text-muted-foreground">All India Rank</p>
                    </div>
                    <div className="rounded-lg bg-secondary-light p-3">
                      <p className="text-xs font-bold text-secondary inline-flex items-center gap-1"><Flame className="h-3 w-3" /> 8 Day Streak</p>
                      <p className="text-[10px] text-muted-foreground">Keep it going!</p>
                    </div>
                    <div className="rounded-lg bg-accent/10 p-3">
                      <p className="text-xs font-bold text-accent">23 Tests Done</p>
                      <p className="text-[10px] text-muted-foreground">This month</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Sparkle decorations */}
              <Sparkles className="absolute -top-4 right-8 h-6 w-6 text-accent animate-pulse" />
              <Sparkles className="absolute bottom-12 -left-4 h-5 w-5 text-primary animate-pulse" />
              <Sparkles className="absolute top-1/3 -right-2 h-4 w-4 text-secondary animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-border bg-card py-8">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 md:grid-cols-4">
          {[
            { icon: BookOpen, num: "50,000+", label: "Enrolled Students" },
            { icon: GraduationCap, num: "200+", label: "Expert Teachers" },
            { icon: FileText, num: "10,000+", label: "Test Questions" },
            { icon: Trophy, num: "Top 0.1%", label: "Results" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center text-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-black font-display text-foreground">{s.num}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-black font-display text-foreground md:text-4xl">
              Everything in One Place
            </h2>
            <p className="mt-2 text-muted-foreground">Everything you need to crack your dream exam</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: BookOpen, title: "Live Classes", desc: "Real-time classes with India's best teachers", color: "bg-destructive/10 text-destructive" },
              { icon: ClipboardCheck, title: "Smart Test Engine", desc: "JEE/NEET pattern with negative marking & rank", color: "bg-primary-light text-primary" },
              { icon: Bot, title: "AI Doubt Solver", desc: "Upload image, get step-by-step solution instantly", color: "bg-secondary-light text-secondary" },
              { icon: BarChart3, title: "Deep Analytics", desc: "Know your weak topics, beat the topper", color: "bg-accent/10 text-accent" },
              { icon: Swords, title: "Compete Mode", desc: "1v1 quiz battles, climb the India rank", color: "bg-[hsl(271,91%,65%)]/10 text-[hsl(271,91%,65%)]" },
              { icon: Smartphone, title: "Mobile App", desc: "Study anywhere, even offline", color: "bg-navy/5 text-foreground" },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${f.color}`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold font-display text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses Preview */}
      <section className="bg-card py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-black font-display text-foreground">Popular Batches</h2>
          <p className="mt-2 text-muted-foreground">Join thousands of students preparing for their dream</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "JEE Physics Booster 2026", teacher: "Ramesh Kumar", price: "₹999", tag: "JEE", color: "from-primary to-primary-dark" },
              { title: "NEET Biology Complete", teacher: "Dr. Sunita Rao", price: "₹1,299", tag: "NEET", color: "from-secondary to-secondary-dark" },
              { title: "Organic Chemistry Mastery", teacher: "Priya Sharma", price: "₹799", tag: "JEE", color: "from-accent to-[hsl(38,92%,42%)]" },
              { title: "Maths for JEE Advanced", teacher: "AK Bansal", price: "₹1,199", tag: "JEE", color: "from-[hsl(271,91%,65%)] to-[hsl(271,81%,45%)]" },
            ].map((c) => (
              <div key={c.title} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <div className={`h-32 bg-gradient-to-br ${c.color} flex items-center justify-center`}>
                  <span className="rounded-pill bg-card/20 px-3 py-1 text-xs font-bold text-card">{c.tag}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold font-display text-foreground text-sm">{c.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{c.teacher}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-accent">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      <span className="text-xs font-semibold">4.8</span>
                    </div>
                    <span className="font-bold font-display text-primary">{c.price}<span className="text-xs font-normal text-muted-foreground">/mo</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-black font-display text-foreground">Simple Pricing</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { name: "Explorer", price: "Free", desc: "Get started", features: ["5 free live classes", "Basic test series", "Community doubts"], cta: "Start Free", popular: false },
              { name: "JEE Pro", price: "₹999", desc: "/month", features: ["Unlimited live classes", "Full test series", "AI doubt solver", "Analytics"], cta: "Get Pro", popular: true },
              { name: "Elite", price: "₹3,999", desc: "/month", features: ["Everything in Pro", "1-on-1 mentoring", "Personal study plan", "Priority support"], cta: "Go Elite", popular: false },
            ].map((p) => (
              <div key={p.name} className={`relative rounded-2xl border p-8 ${p.popular ? 'border-primary bg-card shadow-blue' : 'border-border bg-card shadow-sm'}`}>
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-pill bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-bold font-display text-foreground">{p.name}</h3>
                <div className="mt-4">
                  <span className="text-4xl font-black font-display text-foreground">{p.price}</span>
                  <span className="text-muted-foreground">{p.desc}</span>
                </div>
                <ul className="mt-6 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-secondary" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={`mt-8 block rounded-pill py-3 text-center text-sm font-bold transition-colors ${p.popular ? 'bg-primary text-primary-foreground hover:bg-primary-dark' : 'border border-border text-foreground hover:bg-primary-light'}`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary grid-texture py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-black font-display text-primary-foreground md:text-4xl">Start Now</h2>
          <p className="mt-3 text-primary-foreground/80">Join 50,000+ students already preparing with Arambh Classes</p>
          <Link to="/signup" className="mt-8 inline-flex items-center gap-2 rounded-pill bg-card px-8 py-3.5 text-base font-bold text-primary shadow-lg hover:shadow-xl transition-shadow">
            Start for Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Flame className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-black font-display text-foreground">ARAMBH CLASSES</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <Link to="/courses" className="hover:text-foreground transition-colors">Courses</Link>
              <Link to="/tests" className="hover:text-foreground transition-colors">Tests</Link>
              <Link to="#" className="hover:text-foreground transition-colors">About</Link>
              <Link to="#" className="hover:text-foreground transition-colors">Contact</Link>
              <Link to="#" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="#" className="hover:text-foreground transition-colors">Terms</Link>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
            Made with <Heart className="h-3 w-3 text-destructive fill-destructive" /> for Indian Students · © 2026 Arambh Classes
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
