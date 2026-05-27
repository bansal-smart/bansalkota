import { Link } from "react-router-dom";
import { useState } from "react";
import {
  ArrowRight, BookOpen, Users, Award, MapPin, GraduationCap,
  Sparkles, Trophy, Quote, Smartphone, Play, ChevronRight, Star,
  ShieldCheck, Target, Headphones,
} from "lucide-react";
import BansalButton from "@/components/bansal/BansalButton";
import BansalCard from "@/components/bansal/BansalCard";
import BansalStat from "@/components/bansal/BansalStat";
import BansalBadge from "@/components/bansal/BansalBadge";
import heroStudents from "@/assets/bansal-hero-v2.jpg";
import mentorTeaching from "@/assets/bansal-mentor-v2.jpg";
import toppersImage from "@/assets/bansal-toppers-v2.jpg";
import indiaMap from "@/assets/bansal-pan-india.png";
import appMockup from "@/assets/bansal-app-v2.png";
import resultsBanner from "@/assets/bansal-results-banner.png";

type ExamKey = "jee" | "neet" | "foundation";

const coursesByExam: Record<ExamKey, { name: string; duration: string; mode: string; icon: typeof BookOpen }[]> = {
  jee: [
    { name: "JEE Main + Advanced (Class XI)", duration: "2 Years", mode: "Classroom · Online", icon: GraduationCap },
    { name: "JEE Main + Advanced (Class XII)", duration: "1 Year", mode: "Classroom · Online", icon: Trophy },
    { name: "JEE Crash Course", duration: "3 Months", mode: "Online", icon: Sparkles },
  ],
  neet: [
    { name: "NEET-UG (Class XI)", duration: "2 Years", mode: "Classroom · Online", icon: GraduationCap },
    { name: "NEET-UG (Class XII)", duration: "1 Year", mode: "Classroom · Online", icon: Trophy },
    { name: "NEET Repeater Batch", duration: "1 Year", mode: "Classroom", icon: Award },
  ],
  foundation: [
    { name: "Pre-Foundation (Class VI-VIII)", duration: "Annual", mode: "Classroom · Online", icon: BookOpen },
    { name: "Foundation (Class IX-X)", duration: "Annual", mode: "Classroom · Online", icon: BookOpen },
    { name: "NTSE / Olympiad Booster", duration: "6 Months", mode: "Online", icon: Award },
  ],
};

const achievements = [
  { value: "30+", label: "AIR in JEE Top 100", icon: Trophy },
  { value: "2,500+", label: "IIT Selections", icon: GraduationCap },
  { value: "5,000+", label: "NEET Qualifiers", icon: Star },
  { value: "40+", label: "Years of Legacy", icon: ShieldCheck },
];

const pillars = [
  { icon: Users, title: "Master Mentors", desc: "Faculty with 20+ years of competitive-exam mentoring." },
  { icon: BookOpen, title: "Legendary Material", desc: "Refined over 40 years of toppers and JEE/NEET patterns." },
  { icon: Target, title: "Personal Mentor", desc: "One-to-one mentor for every student — no one studies alone." },
  { icon: Headphones, title: "24×7 Support", desc: "Doubt solving, test analysis, and round-the-clock guidance." },
];

const testimonials = [
  { name: "Aarav Sharma", rank: "AIR 47 — JEE Advanced 2024", quote: "Bansal Classes transformed how I approach problems. The faculty guides you with a strategy, not just answers." },
  { name: "Ishita Verma", rank: "AIR 112 — NEET UG 2024", quote: "Personal attention from mentors and constant test practice made all the difference in my final year." },
  { name: "Rohan Mehta", rank: "AIR 286 — JEE Main 2024", quote: "From Pre-Foundation to JEE, Bansal has been my second home. Ideal for Scholars in every sense." },
];

const LandingPage = () => {
  const [exam, setExam] = useState<ExamKey>("jee");

  return (
    <div className="bg-background">
      {/* 1. HERO */}
      <section className="relative bg-bansal-blue text-white overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-60" />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-bansal-orange/20 blur-3xl" />
        <div className="absolute -left-32 -bottom-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />

        <div className="relative container mx-auto px-4 py-12 md:py-24 grid lg:grid-cols-2 gap-8 md:gap-10 items-center">
          <div className="animate-fade-in-up">
            <BansalBadge tone="orange">
              <Sparkles className="h-3 w-3 mr-1" /> Since 1984 · Kota, Rajasthan
            </BansalBadge>
            <h1 className="mt-5 font-display text-3xl sm:text-4xl md:text-6xl font-extrabold leading-tight">
              Ideal Guidance.{" "}
              <span className="text-bansal-orange">Exceptional Results.</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-white/85 max-w-xl">
              India's most trusted JEE &amp; NEET coaching institute since 1984. Powering dreams from Kota to every corner of India.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/courses">
                <BansalButton variant="cta">
                  Explore Courses <ArrowRight className="h-4 w-4" />
                </BansalButton>
              </Link>
              <Link to="/contact">
                <BansalButton variant="ghost-white">Enquire Now</BansalButton>
              </Link>
            </div>

            {/* Trust strip */}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/75">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-bansal-orange" /> 40+ Yrs Legacy</span>
              <span className="flex items-center gap-1.5"><Trophy className="h-4 w-4 text-bansal-orange" /> 2,500+ IIT Selections</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-bansal-orange" /> 100+ Centers</span>
            </div>
          </div>

          <div className="relative animate-fade-in-up-delay-2 max-w-md mx-auto lg:max-w-none w-full">
            <div className="rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-2 shadow-2xl">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden relative">
                <img
                  src={heroStudents}
                  alt="Bansal Classes students celebrating in classroom"
                  className="absolute inset-0 h-full w-full object-cover"
                  width={1536}
                  height={1024}
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-bansal-blue/40 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 flex items-end justify-between">
                  <div>
                    <p className="font-display text-base sm:text-lg md:text-xl font-bold drop-shadow">Bansal Campus</p>
                    <p className="text-[10px] sm:text-xs text-white/90">Kota · India's Coaching Capital</p>
                  </div>
                  <span className="rounded-full bg-bansal-orange px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. STATS BANNER */}
        <div className="relative border-t border-white/15 bg-white">
          <div className="container mx-auto px-4 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            <BansalStat value="Daily" label="Live Interactive Sessions" />
            <BansalStat value="10M+" label="Tests, Papers &amp; Notes" />
            <BansalStat value="24×7" label="Learning Support" />
            <BansalStat value="100+" label="Offline Centers" />
          </div>
        </div>
      </section>

      {/* 3. ACHIEVEMENTS ROW */}
      <section className="py-12 md:py-16 bg-bansal-orange-light/40">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
            <div>
              <BansalBadge tone="orange">Our Legacy</BansalBadge>
              <h2 className="mt-3 font-display text-3xl md:text-4xl font-extrabold text-bansal-black">
                Numbers That Speak for Themselves
              </h2>
            </div>
            <Link to="/achievements" className="text-sm font-semibold text-bansal-blue hover:text-bansal-orange inline-flex items-center gap-1">
              View Wall of Fame <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {achievements.map((a) => (
              <BansalCard key={a.label} className="text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-bansal-orange/10 flex items-center justify-center">
                  <a.icon className="h-6 w-6 text-bansal-orange" />
                </div>
                <div className="mt-3 font-display text-3xl font-extrabold text-bansal-blue">{a.value}</div>
                <div className="mt-1 text-xs font-medium text-bansal-gray">{a.label}</div>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* 4. WHY BANSAL */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="relative order-2 lg:order-1 max-w-md mx-auto lg:max-w-none w-full">
            <div className="aspect-[4/3] sm:aspect-square rounded-3xl overflow-hidden border-4 border-bansal-blue/10 shadow-xl">
              <img
                src={mentorTeaching}
                alt="Bansal Classes mentor teaching at whiteboard"
                className="h-full w-full object-cover"
                loading="lazy"
                width={1280}
                height={960}
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-bansal-orange text-white rounded-2xl p-5 shadow-xl">
              <div className="font-display text-3xl font-extrabold">40+</div>
              <div className="text-xs font-medium">Years of Excellence</div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <BansalBadge tone="blue">Why Bansal</BansalBadge>
            <h2 className="mt-4 font-display text-3xl md:text-4xl font-extrabold text-bansal-black leading-tight">
              Built for <span className="text-bansal-orange">Scholars</span>. Backed by <span className="text-bansal-orange">Legacy</span>.
            </h2>
            <p className="mt-4 text-bansal-gray">
              Four decades of disciplined preparation, master mentors, and a structured ecosystem designed to take every student to their highest potential.
            </p>
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              {pillars.map((p) => (
                <div key={p.title} className="flex gap-3">
                  <div className="h-10 w-10 rounded-lg bg-bansal-blue-light flex items-center justify-center shrink-0">
                    <p.icon className="h-5 w-5 text-bansal-blue" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-bansal-black">{p.title}</div>
                    <div className="text-sm text-bansal-gray">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/about" className="inline-block mt-8">
              <BansalButton variant="cta">Read More <ArrowRight className="h-4 w-4" /></BansalButton>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. COURSES */}
      <section className="py-12 md:py-20 bg-bansal-blue-light/40">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <BansalBadge tone="blue">Programs</BansalBadge>
            <h2 className="mt-4 font-display text-3xl md:text-4xl font-extrabold text-bansal-black">
              Explore the Ideal Course For You
            </h2>
            <p className="mt-3 text-bansal-gray">From Pre-Foundation to JEE Advanced &amp; NEET-UG — built for serious scholars.</p>
          </div>

          <div className="mt-8 flex justify-center gap-2 flex-wrap">
            {([
              { k: "jee", label: "JEE" },
              { k: "neet", label: "NEET UG" },
              { k: "foundation", label: "Pre Foundation" },
            ] as const).map((t) => (
              <button
                key={t.k}
                onClick={() => setExam(t.k)}
                className={`rounded-full px-6 py-2.5 text-sm font-semibold transition-all ${
                  exam === t.k
                    ? "bg-bansal-blue text-white shadow-blue"
                    : "bg-white text-bansal-blue hover:bg-bansal-blue/5"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-8 md:mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 stagger-children">
            {coursesByExam[exam].map((c) => (
              <BansalCard key={c.name}>
                <div className="h-12 w-12 rounded-full bg-bansal-orange-light flex items-center justify-center mb-4">
                  <c.icon className="h-6 w-6 text-bansal-orange" />
                </div>
                <h3 className="font-display text-lg font-bold text-bansal-black">{c.name}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <BansalBadge tone="blue">{c.duration}</BansalBadge>
                  <BansalBadge tone="gray">{c.mode}</BansalBadge>
                </div>
                <Link to="/courses" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-bansal-blue hover:text-bansal-orange">
                  View Details <ArrowRight className="h-4 w-4" />
                </Link>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CLP vs DLP */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <BansalBadge tone="blue">Teaching Programs</BansalBadge>
            <h2 className="mt-4 font-display text-3xl md:text-4xl font-extrabold text-bansal-black">
              Two Ways to Learn the Bansal Way
            </h2>
          </div>
          <div className="mt-10 grid md:grid-cols-2 gap-6">
            <BansalCard>
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-xl bg-bansal-blue flex items-center justify-center shrink-0">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-bansal-black">Classroom Learning Program (CLP)</h3>
                  <p className="mt-2 text-bansal-gray text-sm">
                    Live classroom sessions at 100+ Bansal centers across India. Direct interaction with master mentors, daily doubt sessions, weekly tests, and a peer-learning environment built for toppers.
                  </p>
                  <Link to="/courses" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-bansal-blue hover:text-bansal-orange">
                    Know More <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </BansalCard>
            <BansalCard>
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-xl bg-bansal-orange flex items-center justify-center shrink-0">
                  <BookOpen className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-bansal-black">Distance Learning Program (DLP)</h3>
                  <p className="mt-2 text-bansal-gray text-sm">
                    Bansal's legendary study material, sectional &amp; full tests, and detailed solutions delivered to your home. Self-paced preparation backed by the same content that has produced thousands of toppers.
                  </p>
                  <Link to="/courses" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-bansal-blue hover:text-bansal-orange">
                    Know More <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </BansalCard>
          </div>
        </div>
      </section>

      {/* 7. BOOST */}
      <section className="py-16 bg-bansal-blue text-white relative overflow-hidden">
        <div className="absolute inset-0 grid-texture opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-r from-bansal-blue via-bansal-blue to-bansal-blue-dark" />
        <div className="relative container mx-auto px-4 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <BansalBadge tone="orange">BOOST 2026</BansalBadge>
            <h2 className="mt-4 font-display text-3xl md:text-4xl font-extrabold leading-tight">
              Bansal Open Opportunity Scholarship Test
            </h2>
            <p className="mt-4 text-white/85">
              Up to <span className="text-bansal-orange font-bold">90% Scholarship</span>. Open to Class V to XII. Just <span className="text-bansal-orange font-bold">₹99</span> to register.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["31 May 2026", "07 Jun 2026", "14 Jun 2026"].map((d) => (
                <span key={d} className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{d}</span>
              ))}
            </div>
          </div>
          <div className="text-center lg:text-right">
            <Link to="/boost" className="inline-block">
              <BansalButton variant="cta" className="text-base px-8 py-4">
                Register for ₹99 <ArrowRight className="h-5 w-5" />
              </BansalButton>
            </Link>
            <p className="mt-3 text-xs text-white/70">Apply before 30 May 2026, 6:00 PM</p>
          </div>
        </div>
      </section>

      {/* 8. TOPPERS / TESTIMONIALS */}
      <section className="py-12 md:py-20 bg-bansal-orange-light/30 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8 items-center mb-12">
            <div className="lg:col-span-1">
              <BansalBadge tone="orange">Toppers Speak</BansalBadge>
              <h2 className="mt-4 font-display text-3xl md:text-4xl font-extrabold text-bansal-black">
                Voices of <span className="text-bansal-orange">Excellence</span>
              </h2>
              <p className="mt-3 text-bansal-gray">Real stories from real toppers who started their journey at Bansal Classes.</p>
              <Link to="/achievements" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-bansal-blue hover:text-bansal-orange">
                See All Toppers <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="lg:col-span-2">
              <div className="rounded-3xl overflow-hidden shadow-xl aspect-[16/9]">
                <img
                  src={toppersImage}
                  alt="Bansal Classes toppers with awards"
                  className="h-full w-full object-cover"
                  loading="lazy"
                  width={1600}
                  height={900}
                />
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6 stagger-children">
            {testimonials.map((t) => (
              <BansalCard key={t.name}>
                <Quote className="h-8 w-8 text-bansal-blue/20" />
                <p className="mt-3 text-bansal-black leading-relaxed">"{t.quote}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-bansal-blue text-white flex items-center justify-center font-display font-bold">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <div className="font-display font-bold text-bansal-black">{t.name}</div>
                    <div className="text-xs font-semibold text-bansal-orange">{t.rank}</div>
                  </div>
                </div>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* 9. CENTERS TEASER */}
      <section className="py-12 md:py-20 bg-white">
        <div className="container mx-auto px-4 grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <BansalBadge tone="blue">Pan-India Presence</BansalBadge>
            <h2 className="mt-4 font-display text-3xl md:text-4xl font-extrabold text-bansal-black leading-tight">
              100+ Centers Across <span className="text-bansal-orange">India</span>
            </h2>
            <p className="mt-4 text-bansal-gray">
              From our headquarters in Kota to every major city — find a Bansal center near you and start your journey with India's most trusted coaching legacy.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Kota", "Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Pune", "Jaipur", "Lucknow"].map((c) => (
                <span key={c} className="rounded-full bg-bansal-blue-light text-bansal-blue px-3 py-1 text-xs font-semibold">
                  <MapPin className="inline h-3 w-3 mr-1" />{c}
                </span>
              ))}
            </div>
            <Link to="/centers" className="inline-block mt-8">
              <BansalButton variant="primary">Find a Center <ArrowRight className="h-4 w-4" /></BansalButton>
            </Link>
          </div>
          <div className="relative max-w-sm mx-auto lg:max-w-none w-full">
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-bansal-blue-light to-bansal-orange-light/40 p-6 sm:p-8 flex items-center justify-center">
              <img
                src={indiaMap}
                alt="Bansal Classes centers across India"
                className="h-full w-full object-contain"
                loading="lazy"
                width={1024}
                height={1024}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 10. APP CTA */}
      <section className="py-16 bg-bansal-orange text-white relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative container mx-auto px-4 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <BansalBadge tone="gray">Coming Soon</BansalBadge>
            <h2 className="mt-4 font-display text-3xl md:text-4xl font-extrabold">
              The Bansal Classes App
            </h2>
            <p className="mt-3 text-white/90 max-w-lg">
              Expert faculty, live classes, instant doubt solving, and India's most-loved test series — all in your pocket.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {["Expert Faculty", "Live Classes", "Doubt Solving", "Test Series"].map((f) => (
                <span key={f} className="rounded-full bg-white/20 px-4 py-2 text-xs font-semibold">{f}</span>
              ))}
            </div>
            <div className="mt-6 inline-flex items-center gap-3 rounded-xl bg-bansal-black px-5 py-3">
              <Play className="h-6 w-6 text-white" />
              <div>
                <div className="text-[10px] uppercase tracking-wide text-white/70">Coming soon on</div>
                <div className="font-display font-bold">Google Play</div>
              </div>
            </div>
          </div>
          <div className="relative flex justify-center">
            <img
              src={appMockup}
              alt="Bansal Classes mobile app preview"
              className="h-64 sm:h-80 md:h-96 w-auto object-contain drop-shadow-2xl"
              loading="lazy"
              width={1024}
              height={1024}
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
