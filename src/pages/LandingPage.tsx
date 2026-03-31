import { Link } from "react-router-dom";
import { ArrowRight, Play, BookOpen, ClipboardCheck, Bot, BarChart3, Swords, Smartphone, Star, Check, Flame, Rocket, GraduationCap, FileText, Trophy, Users, Monitor, Award, Heart, Sparkles, Globe, Video, User, MessageCircle, Quote, Zap, Target, Shield, Clock, ChevronRight } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import heroStudent from "@/assets/hero-student.png";
import coursePhysics from "@/assets/course-physics.png";
import courseChemistry from "@/assets/course-chemistry.png";
import courseMaths from "@/assets/course-maths.png";
import courseBiology from "@/assets/course-biology.png";
import featureLive from "@/assets/feature-live.png";

const LandingPage = () => {
  const { country, setCountry } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Country Selector Banner */}
      <div className="bg-gradient-to-r from-primary to-accent py-1.5">
        <div className="container mx-auto flex items-center justify-center gap-3 px-4">
          <Globe className="h-3.5 w-3.5 text-primary-foreground" />
          <span className="text-[11px] font-medium text-primary-foreground/80">Choose your region:</span>
          <div className="flex rounded-full bg-primary-foreground/20 p-0.5">
            <button onClick={() => setCountry('india')} className={`rounded-full px-3 py-0.5 text-[11px] font-bold transition-colors ${country === 'india' ? 'bg-primary-foreground text-primary' : 'text-primary-foreground/80 hover:text-primary-foreground'}`}>
              🇮🇳 India
            </button>
            <button onClick={() => setCountry('dubai')} className={`rounded-full px-3 py-0.5 text-[11px] font-bold transition-colors ${country === 'dubai' ? 'bg-primary-foreground text-primary' : 'text-primary-foreground/80 hover:text-primary-foreground'}`}>
              🇦🇪 Dubai
            </button>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
              <Flame className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-black font-display gradient-text">ARAMBH</span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <Link to="/courses" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Courses</Link>
            <Link to="/tests" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Tests</Link>
            <Link to="/live-classes" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Live Classes</Link>
            <Link to="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-foreground hover:text-primary transition-colors">Login</Link>
            <Link to="/signup" className="rounded-pill bg-gradient-to-r from-primary to-accent px-5 py-2 text-sm font-bold text-primary-foreground shadow-blue hover:opacity-90 transition-opacity">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--navy))] via-[hsl(var(--navy2))] to-[hsl(222,47%,15%)] grid-texture">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-2 rounded-pill bg-gradient-to-r from-primary/20 to-accent/20 px-4 py-1.5 text-sm font-semibold text-primary">
                <Rocket className="h-4 w-4" /> {country === 'india' ? "India's Rising EdTech Platform" : "UAE's Trusted EdTech Platform"}
              </span>
              <h1 className="mt-6 font-display">
                <span className="block text-4xl font-black text-white md:text-5xl lg:text-6xl">Start Your Journey,</span>
                <span className="block text-4xl font-black md:text-5xl lg:text-6xl gradient-text">Reach Your Goals</span>
              </h1>
              <p className="mt-3 text-lg font-semibold text-white/70">JEE · NEET · Board Exams | India & Dubai</p>
              <p className="mt-4 max-w-md text-white/50">
                Master your exams with live classes from top educators, AI-powered doubt solving, and smart test analytics.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to="/signup" className="inline-flex items-center gap-2 rounded-pill bg-gradient-to-r from-primary to-accent px-7 py-3 text-base font-bold text-primary-foreground shadow-blue hover:opacity-90 transition-all">
                  Start for Free <ArrowRight className="h-4 w-4" />
                </Link>
                <button className="inline-flex items-center gap-2 rounded-pill border border-white/20 px-6 py-3 text-base font-semibold text-white hover:bg-white/10 transition-colors">
                  <Play className="h-4 w-4" /> Watch Demo
                </button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-white/60">
                <span className="inline-flex items-center gap-1.5 font-semibold"><Users className="h-4 w-4 text-primary" /> 10,000+ Students</span>
                <span className="inline-flex items-center gap-1.5 font-semibold"><Monitor className="h-4 w-4 text-primary" /> 500+ Live Classes</span>
                <span className="inline-flex items-center gap-1.5 font-semibold"><Award className="h-4 w-4 text-primary" /> 99% Results</span>
              </div>
            </div>
            <div className="relative hidden md:block animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <img src={heroStudent} alt="Student studying with laptop and books" width={800} height={640} className="mx-auto w-80 drop-shadow-2xl animate-float" />
              <Sparkles className="absolute -top-4 right-8 h-6 w-6 text-accent animate-pulse" />
              <Sparkles className="absolute bottom-12 -left-4 h-5 w-5 text-primary animate-pulse" />
              <Sparkles className="absolute top-1/3 -right-2 h-4 w-4 text-secondary animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-border bg-card py-8">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 md:grid-cols-4 stagger-children">
          {[
            { icon: BookOpen, num: "50,000+", label: "Enrolled Students" },
            { icon: GraduationCap, num: "200+", label: "Expert Teachers" },
            { icon: FileText, num: "10,000+", label: "Test Questions" },
            { icon: Trophy, num: "Top 0.1%", label: "Results" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center text-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-light to-accent/10">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-2xl font-black font-display text-foreground">{s.num}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center animate-fade-in-up">
            <h2 className="text-3xl font-black font-display text-foreground md:text-4xl">How It Works</h2>
            <p className="mt-2 text-muted-foreground">Get started in 3 simple steps</p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3 stagger-children relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5 border-t-2 border-dashed border-primary/30" />
            {[
              { step: "1", icon: User, title: "Sign Up Free", desc: "Create your account in under 30 seconds. Choose your exam goal and get a personalized dashboard." },
              { step: "2", icon: BookOpen, title: "Choose Your Course", desc: "Browse courses by subject or goal. Enroll in live batches, 1-on-1 mentoring, or recorded lectures." },
              { step: "3", icon: Rocket, title: "Start Learning", desc: "Attend live classes, take tests, ask doubts via AI, and track your progress with analytics." },
            ].map((s) => (
              <div key={s.step} className="relative text-center hover-lift">
                <div className="relative z-10 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg mb-5">
                  <s.icon className="h-7 w-7 text-white" />
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-primary shadow border-2 border-primary">{s.step}</span>
                </div>
                <h3 className="text-lg font-bold font-display text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center animate-fade-in-up">
            <h2 className="text-3xl font-black font-display text-foreground md:text-4xl">
              Everything in One Place
            </h2>
            <p className="mt-2 text-muted-foreground">Everything you need to crack your dream exam</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {[
              { icon: BookOpen, title: "Live Classes", desc: "Real-time classes with top educators", color: "bg-primary/10 text-primary", img: featureLive },
              { icon: ClipboardCheck, title: "Smart Test Engine", desc: "JEE/NEET pattern with negative marking & rank", color: "bg-primary-light text-primary" },
              { icon: Bot, title: "AI Doubt Solver", desc: "Upload image, get step-by-step solution instantly", color: "bg-secondary-light text-secondary" },
              { icon: BarChart3, title: "Deep Analytics", desc: "Know your weak topics, beat the topper", color: "bg-accent/10 text-accent" },
              { icon: Swords, title: "Compete Mode", desc: "1v1 quiz battles, climb the India rank", color: "bg-primary/10 text-primary" },
              { icon: Smartphone, title: "Mobile App", desc: "Study anywhere, even offline", color: "bg-secondary/10 text-secondary" },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-background p-6 shadow-sm hover-lift">
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

      {/* Class Formats */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center animate-fade-in-up">
            <h2 className="text-3xl font-black font-display text-foreground md:text-4xl">Flexible Class Formats</h2>
            <p className="mt-2 text-muted-foreground">Choose how you want to learn</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3 stagger-children">
            {[
              { icon: User, title: "1-on-1 Private Classes", desc: "Personal attention with custom pace and flexible scheduling. Ideal for focused mentoring on weak areas.", features: ["Dedicated mentor", "Custom schedule", "Personalized plan", "Flexible timing"], gradient: "from-primary to-primary-dark" },
              { icon: Users, title: "Live Batch Classes", desc: "Interactive group sessions with real-time doubt solving and peer learning. Join batches of 30-50 students.", features: ["Live interaction", "Real-time doubts", "Peer learning", "Recorded replays"], gradient: "from-secondary to-secondary-dark" },
              { icon: Video, title: "Recorded Lectures", desc: "Learn at your own pace, rewatch anytime. Complete chapter-wise organized course library access.", features: ["Self-paced", "Rewatch anytime", "Chapter-wise", "Offline access"], gradient: "from-accent to-primary" },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card overflow-hidden hover-lift group">
                <div className={`bg-gradient-to-br ${f.gradient} p-6 text-center`}>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur mb-3">
                    <f.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold font-display text-white">{f.title}</h3>
                </div>
                <div className="p-5">
                  <p className="text-sm text-muted-foreground mb-4">{f.desc}</p>
                  <ul className="space-y-2">
                    {f.features.map(feat => (
                      <li key={feat} className="flex items-center gap-2 text-xs text-foreground">
                        <Check className="h-3.5 w-3.5 text-secondary shrink-0" /> {feat}
                      </li>
                    ))}
                  </ul>
                  <Link to="/courses" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    Learn More <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Courses Preview */}
      <section className="bg-card py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-black font-display text-foreground animate-fade-in-up">Popular Batches</h2>
          <p className="mt-2 text-muted-foreground">Join thousands of students preparing for their dream</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
            {[
              { title: "JEE Physics Booster 2026", teacher: "Vikram Thapar", price: country === 'india' ? "₹999" : "AED 149", tag: "JEE", color: "from-primary to-primary-dark", img: coursePhysics },
              { title: "NEET Biology Complete", teacher: "Dr. Kavitha Menon", price: country === 'india' ? "₹1,299" : "AED 199", tag: "NEET", color: "from-secondary to-secondary-dark", img: courseBiology },
              { title: "Organic Chemistry Mastery", teacher: "Ananya Iyer", price: country === 'india' ? "₹799" : "AED 119", tag: "JEE", color: "from-accent to-primary", img: courseChemistry },
              { title: "Maths for JEE Advanced", teacher: "Dr. Siddharth Nair", price: country === 'india' ? "₹1,199" : "AED 179", tag: "JEE", color: "from-primary-dark to-accent", img: courseMaths },
            ].map((c) => (
              <div key={c.title} className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm hover-lift">
                <div className={`h-36 bg-gradient-to-br ${c.color} relative flex items-center justify-center overflow-hidden`}>
                  <img src={c.img} alt={c.title} loading="lazy" className="h-28 w-28 object-contain opacity-80" />
                  <span className="absolute top-3 left-3 rounded-pill bg-white/20 px-3 py-1 text-xs font-bold text-white">{c.tag}</span>
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

      {/* Meet Our Educators */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center animate-fade-in-up">
            <h2 className="text-3xl font-black font-display text-foreground md:text-4xl">Meet Our Educators</h2>
            <p className="mt-2 text-muted-foreground">Learn from the best in the industry</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
            {[
              { name: "Vikram Thapar", subject: "Physics", rating: 4.9, students: "12.5K", bio: "IIT Delhi alumnus with 15+ years of teaching experience. Known for making complex concepts simple.", gradient: "from-primary to-primary-dark", initials: "VT" },
              { name: "Ananya Iyer", subject: "Chemistry", rating: 4.8, students: "9.8K", bio: "PhD in Organic Chemistry from IISc. Passionate about making chemistry fun and relatable.", gradient: "from-secondary to-secondary-dark", initials: "AI" },
              { name: "Dr. Siddharth Nair", subject: "Mathematics", rating: 4.9, students: "15.2K", bio: "Gold medalist in Mathematics. Simplifies JEE Advanced problems with unique techniques.", gradient: "from-accent to-primary", initials: "SN" },
              { name: "Dr. Kavitha Menon", subject: "Biology", rating: 4.8, students: "11.3K", bio: "AIIMS alumna. Expert in NEET Biology with a focus on diagrams and mnemonics.", gradient: "from-primary-dark to-secondary", initials: "KM" },
            ].map((edu) => (
              <div key={edu.name} className="rounded-2xl border border-border bg-card overflow-hidden hover-lift text-center">
                <div className={`bg-gradient-to-br ${edu.gradient} py-8 relative`}>
                  <div className="mx-auto h-20 w-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold text-white border-2 border-white/30">
                    {edu.initials}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold font-display text-foreground">{edu.name}</h3>
                  <p className="text-xs text-primary font-semibold">{edu.subject}</p>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{edu.bio}</p>
                  <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Star className="h-3 w-3 text-accent fill-accent" /> {edu.rating}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {edu.students}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Student Success Stories */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center animate-fade-in-up">
            <h2 className="text-3xl font-black font-display text-foreground md:text-4xl">Student Success Stories</h2>
            <p className="mt-2 text-muted-foreground">Real results from real students</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3 stagger-children">
            {[
              { name: "Aditya Rajan", exam: "JEE Advanced 2025", result: "AIR 342", quote: "Arambh's live classes and AI doubt solver helped me crack JEE Advanced. Vikram Sir's physics classes were a game changer!", avatar: "AR", tag: "IIT Bombay" },
              { name: "Ishita Bansal", exam: "NEET 2025", result: "AIR 156", quote: "The test series and analytics helped me identify my weak areas. Dr. Kavitha's biology classes were incredibly detailed.", avatar: "IB", tag: "AIIMS Delhi" },
              { name: "Karan Malhotra", exam: "JEE Main 2025", result: "99.8%ile", quote: "I loved the compete mode — battling peers kept me motivated. The 1-on-1 mentoring sessions were the real difference maker.", avatar: "KM", tag: "IIT Delhi" },
            ].map((s) => (
              <div key={s.name} className="rounded-2xl border border-border bg-background p-6 hover-lift relative">
                <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold text-white">
                    {s.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.exam}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground italic leading-relaxed">"{s.quote}"</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-bold text-secondary">{s.result}</span>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{s.tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-black font-display text-foreground animate-fade-in-up">Simple Pricing</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3 stagger-children">
            {[
              { name: "Explorer", price: "Free", desc: "Get started", features: ["5 free live classes", "Basic test series", "Community doubts"], cta: "Start Free", popular: false },
              { name: "JEE Pro", price: country === 'india' ? "₹999" : "AED 149", desc: "/month", features: ["Unlimited live classes", "Full test series", "AI doubt solver", "Analytics"], cta: "Get Pro", popular: true },
              { name: "Elite", price: country === 'india' ? "₹3,999" : "AED 599", desc: "/month", features: ["Everything in Pro", "1-on-1 mentoring", "Personal study plan", "Priority support"], cta: "Go Elite", popular: false },
            ].map((p) => (
              <div key={p.name} className={`relative rounded-2xl border p-8 hover-lift ${p.popular ? 'border-primary bg-card shadow-blue' : 'border-border bg-card shadow-sm'}`}>
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-pill bg-gradient-to-r from-primary to-accent px-4 py-1 text-xs font-bold text-primary-foreground">
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
                  className={`mt-8 block rounded-pill py-3 text-center text-sm font-bold transition-colors ${p.popular ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90' : 'border border-border text-foreground hover:bg-primary-light'}`}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Arambh vs Traditional */}
      <section className="py-16 md:py-24 bg-card">
        <div className="container mx-auto px-4">
          <div className="text-center animate-fade-in-up">
            <h2 className="text-3xl font-black font-display text-foreground md:text-4xl">Why Arambh?</h2>
            <p className="mt-2 text-muted-foreground">See how we compare to traditional coaching</p>
          </div>
          <div className="mt-12 max-w-3xl mx-auto rounded-2xl border border-border bg-background overflow-hidden">
            <div className="grid grid-cols-3 bg-gradient-to-r from-primary to-accent text-white text-center">
              <div className="p-4 text-sm font-bold">Feature</div>
              <div className="p-4 text-sm font-bold">Arambh Classes</div>
              <div className="p-4 text-sm font-bold">Traditional Coaching</div>
            </div>
            {[
              { feature: "Live + Recorded Classes", arambh: true, traditional: false },
              { feature: "AI Doubt Solver (24/7)", arambh: true, traditional: false },
              { feature: "1-on-1 Mentoring", arambh: true, traditional: false },
              { feature: "Flexible Schedule", arambh: true, traditional: false },
              { feature: "Smart Analytics & Tracking", arambh: true, traditional: false },
              { feature: "Affordable Pricing", arambh: true, traditional: false },
              { feature: "Compete with Peers (India Rank)", arambh: true, traditional: false },
              { feature: "Learn from Anywhere", arambh: true, traditional: false },
            ].map((row, i) => (
              <div key={row.feature} className={`grid grid-cols-3 text-center border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                <div className="p-3 text-xs font-medium text-foreground text-left pl-6">{row.feature}</div>
                <div className="p-3 text-sm">
                  {row.arambh ? <Check className="h-5 w-5 text-secondary mx-auto" /> : <span className="text-muted-foreground">—</span>}
                </div>
                <div className="p-3 text-sm">
                  {row.traditional ? <Check className="h-5 w-5 text-secondary mx-auto" /> : <span className="text-muted-foreground">✕</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-primary via-primary-dark to-accent grid-texture py-16">
        <div className="container mx-auto px-4 text-center animate-fade-in-up">
          <h2 className="text-3xl font-black font-display text-white md:text-4xl">Start Now</h2>
          <p className="mt-3 text-white/80">Join 50,000+ students already preparing with Arambh Classes</p>
          <Link to="/signup" className="mt-8 inline-flex items-center gap-2 rounded-pill bg-white px-8 py-3.5 text-base font-bold text-primary shadow-lg hover:shadow-xl transition-shadow">
            Start for Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-[hsl(var(--navy))] py-12 text-white">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent">
                  <Flame className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-black font-display gradient-text">ARAMBH CLASSES</span>
              </div>
              <p className="text-sm text-white/50">Empowering students across India & Dubai to achieve their dream exam results.</p>
              <div className="flex gap-3 mt-4">
                {["Twitter", "YouTube", "Instagram"].map(s => (
                  <div key={s} className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60 hover:bg-white/20 cursor-pointer transition-colors">
                    {s[0]}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold mb-3 text-white/90">Quick Links</h4>
              <div className="space-y-2">
                {["Courses", "Tests", "Live Classes", "Question Bank"].map(l => (
                  <Link key={l} to={`/${l.toLowerCase().replace(/ /g, '-')}`} className="block text-sm text-white/50 hover:text-white/80 transition-colors">{l}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold mb-3 text-white/90">Company</h4>
              <div className="space-y-2">
                {["About Us", "Contact", "Privacy Policy", "Terms of Service"].map(l => (
                  <Link key={l} to="#" className="block text-sm text-white/50 hover:text-white/80 transition-colors">{l}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold mb-3 text-white/90">Reach Us</h4>
              <div className="space-y-2 text-sm text-white/50">
                <p>🇮🇳 New Delhi, India</p>
                <p>🇦🇪 Dubai, UAE</p>
                <p>support@arambhclasses.com</p>
              </div>
              <div className="mt-4 flex gap-2">
                <div className="rounded-lg bg-white/10 px-3 py-2 text-[10px] font-bold text-white/70">📱 App Store</div>
                <div className="rounded-lg bg-white/10 px-3 py-2 text-[10px] font-bold text-white/70">▶ Google Play</div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-center text-xs text-white/40 flex items-center justify-center gap-1">
              Made with <Heart className="h-3 w-3 text-destructive fill-destructive" /> for Students · © 2026 Arambh Classes
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
