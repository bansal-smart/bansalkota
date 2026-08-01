import { useState } from "react";
import {
  Trophy,
  GraduationCap,
  Calendar,
  IndianRupee,
  Clock,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Users,
  ChevronDown,
} from "lucide-react";
import BansalButton from "@/components/bansal/BansalButton";
import BansalCard from "@/components/bansal/BansalCard";
import BansalBadge from "@/components/bansal/BansalBadge";
import boostHero from "@/assets/boost-hero-banner.png";
import { FloatingIcons, DotTexture } from "@/components/bansal/BansalDecor";
import BoostRegistrationModal from "@/components/BoostRegistrationModal";
import { useBoostSettings } from "@/hooks/useBoostSettings";
import { useSiteBanner } from "@/hooks/useSiteBanner";

const benefits = [
  {
    icon: Trophy,
    title: "Upto 100% Scholarship",
    desc: "Win huge fee waivers on Bansal Classes JEE/NEET/Foundation programs based on your rank.",
  },
  {
    icon: GraduationCap,
    title: "Personal Mentorship",
    desc: "Top 100 rankers get a one-on-one mentor session with Bansal senior faculty.",
  },
];

const faqs = [
  {
    q: "Who can appear for BOOST?",
    a: "Any student from Class 5 to Class 12 (and droppers) preparing for school, Olympiads, JEE, or NEET can register.",
  },
  {
    q: "What will be the timings of the test?",
    a: "Duration of the Online test will be 1 Hour. A Student can appear in the test between 9 AM to 6 PM on the test day only.",
  },
  {
    q: "How to apply & where to take Online Test?",
    a: "You can apply online on www.bansal.ac.in after the registration, Student will receive a direct link to appear in the test.",
  },
  {
    q: "What is the syllabus of BOOST?",
    a: "Syllabus for each class is available on www.bansal.ac.in",
  },
  {
    q: "When will the result be declared?",
    a: "Result of first 3 BOOST Test (Which are free of Cost) shall be declared in the last week of September. Results of BOOST to be conducted from October 2026 will be declared after 3 days of BOOST.",
  },
  {
    q: "Can I appear in the test from the Institute campus?",
    a: "Yes. Student can visit BANSAL Classes, KOTA Campus & appear in the test. For the other Study Centers, Student need to contact the respective study center.",
  },
  {
    q: "What subjects are covered in BOOST?",
    a: "The test includes Math, Science, and Mental Ability / Logical Reasoning. For higher classes, it may include Physics, Chemistry, and Biology, depending on the student's stream and class.",
  },
  {
    q: "Can I take the test from home?",
    a: "Yes, the online mode is fully proctored. You can also choose an offline slot at a nearby Bansal center.",
  },
  {
    q: "How is the scholarship applied?",
    a: "Your scholarship percentage is auto-applied to your Bansal Classes course fee at the time of admission.",
  },
];

export default function BoostPage() {
  const [regOpen, setRegOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const boost = useBoostSettings();
  const { banner } = useSiteBanner("boost");
  const timeline = [
    { phase: "Registration", date: "Open Now", desc: `Pay ₹${boost.priceInr} and reserve your slot on bansal.ac.in` },
    { phase: "Admit Card", date: "T-3 days", desc: "Download your admit card from the official portal" },
    { phase: "Test Day", date: "Every Sunday", desc: "Online slots and offline center slots available" },
    { phase: "Result", date: "Within 48 hrs", desc: "Scholarship + counselling call from Bansal admissions" },
  ];
  return (
    <div className="min-h-screen bg-background">
      <BoostRegistrationModal open={regOpen} onClose={() => setRegOpen(false)} />
      {/* Hero */}
      <section className="bg-bansal-blue text-white py-16 md:py-24 relative overflow-hidden">
        <img
          src={banner?.image_url || boostHero}
          alt="BOOST scholarship test — confident student surrounded by glowing science and math symbols"
          className="absolute inset-0 h-full w-full object-cover object-right"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bansal-blue via-bansal-blue/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-bansal-blue/40 via-transparent to-bansal-blue/60 md:hidden" />
        <FloatingIcons defaultTone="white" className="opacity-30" />
        <DotTexture tone="white" className="opacity-15 decor-fade" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl">
            <BansalBadge variant="orange" className="mb-5">
              Bansal Flagship Scholarship Test
            </BansalBadge>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-5">
              {banner?.headline ? (
                banner.headline
              ) : (
                <>
                  BOOST <span className="text-bansal-orange">Scholarship Test</span>
                </>
              )}
            </h1>
            <p className="text-lg md:text-xl text-white/85 mb-8 max-w-2xl leading-relaxed">
              {banner?.subheading || (
                <>
                  Win up to <span className="text-bansal-orange font-bold">100% scholarship</span> on India's most
                  trusted JEE / NEET coaching at Bansal Classes, Kota. Just{" "}
                  <span className="font-bold">₹{boost.priceInr}</span> to register.
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-3">
              <BansalButton variant="cta" className="text-base px-8 py-4" onClick={() => setRegOpen(true)}>
                Register Now
              </BansalButton>
              <a href="#how-it-works">
                <BansalButton variant="ghost-white" className="text-base px-8 py-4">
                  How it works
                </BansalButton>
              </a>
            </div>
            {boost.examDateLabels.length > 0 && (
              <div className="mt-6 space-y-2">
                <div className="flex flex-wrap gap-2">
                  {boost.examDateLabels.map((d) => {
                    const isNext = boost.nextExamDateLabel === d;
                    return (
                      <span
                        key={d}
                        className={
                          isNext
                            ? "rounded-full bg-bansal-orange text-white px-4 py-1.5 text-sm font-bold ring-2 ring-white/40 shadow-lg"
                            : "rounded-full bg-white/15 text-white px-4 py-1.5 text-sm font-semibold"
                        }
                      >
                        {d}
                        {isNext && <span className="ml-2 text-[10px] uppercase tracking-wider">Upcoming</span>}
                      </span>
                    );
                  })}
                </div>
                {boost.applyBeforeLabel && <p className="text-xs text-white/70">{boost.applyBeforeLabel}</p>}
              </div>
            )}
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-xl">
              {[
                { v: "100%", l: "Max Scholarship" },
                { v: `₹${boost.priceInr}`, l: "Reg. Fee" },
                { v: "30K+", l: "Students/Year" },
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

      {/* Introduction & What is BOOST */}
      <section className="py-16 md:py-20 bg-background border-b border-border/40">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-center">
            <div className="md:col-span-5">
              <BansalBadge variant="blue" className="mb-4">
                Legacy of Excellence
              </BansalBadge>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black leading-tight">
                Education City Kota's Oldest Institute
              </h2>
            </div>
            <div className="md:col-span-7 space-y-4 text-muted-foreground leading-relaxed text-sm md:text-base">
              <p>
                <strong>Bansal Classes, KOTA</strong> is India's most trusted Institute for the preparation of JEE (Main & Advanced), NEET (UG), Olympiads & Foundation (School & Board Examinations). Started by legendary Shri V. K. Bansal Sir in 1981, it is Education City KOTA's oldest Institute.
              </p>
              <p className="bg-primary/5 p-4 rounded-xl border border-primary/10 text-bansal-black font-medium">
                <strong>What is BOOST?</strong> BOOST is a Scholarship Test to be conducted for the students currently studying in Classes 4th to 10th and 11th & 12th (PCM & PCB) in 2026-27 & moving to classes 5th to 12th & 12th Passed in Academic Session 2027-28.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-20 bg-bansal-cream">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <BansalBadge variant="blue" className="mb-3">
              Benefits of BOOST
            </BansalBadge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black">Rewards Worth the Hustle</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {benefits.map((b) => (
              <BansalCard key={b.title} className="hover-lift border border-border/40 p-6 flex flex-col justify-between">
                <div>
                  <div className="h-12 w-12 rounded-lg bg-bansal-orange/10 text-bansal-orange flex items-center justify-center mb-4">
                    <b.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-bansal-black mb-3">{b.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                </div>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* BOOST Details */}
      <section id="how-it-works" className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <BansalBadge variant="blue" className="mb-3">
              Exam Structure
            </BansalBadge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black">BOOST Details</h2>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-lg">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-bansal-blue text-white font-semibold">
                  <th className="p-4 border-b border-border">Parameter</th>
                  <th className="p-4 border-b border-border bg-bansal-blue/95">NEEV (Foundation)</th>
                  <th className="p-4 border-b border-border bg-bansal-blue/90">JEE (Main & Advanced)</th>
                  <th className="p-4 border-b border-border bg-bansal-blue/85">NEET (UG)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-bansal-black">
                <tr className="hover:bg-muted/30">
                  <td className="p-4 font-bold bg-muted/20">Classes (in 2026-27)</td>
                  <td className="p-4">4<sup>th</sup> to 9<sup>th</sup></td>
                  <td className="p-4">10<sup>th</sup>, 11<sup>th</sup> & 12<sup>th</sup> (PCM)</td>
                  <td className="p-4">10<sup>th</sup>, 11<sup>th</sup> & 12<sup>th</sup> (PCB)</td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="p-4 font-bold bg-muted/20">Mode of Exam</td>
                  <td colSpan={3} className="p-4 text-center font-medium bg-primary/5">
                    Online (At Home) / Offline (At Center)
                  </td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="p-4 font-bold bg-muted/20">Medium</td>
                  <td className="p-4 font-semibold">ENGLISH</td>
                  <td className="p-4 font-semibold">ENGLISH</td>
                  <td className="p-4 font-semibold">ENGLISH</td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="p-4 font-bold bg-muted/20">Duration</td>
                  <td colSpan={3} className="p-4 text-center font-medium bg-primary/5">
                    60 Minutes (Online Test) | 90 Minutes (Offline Test)
                  </td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="p-4 font-bold bg-muted/20">No. of Questions</td>
                  <td className="p-4">75 Ques.</td>
                  <td className="p-4">75 Ques.</td>
                  <td className="p-4">80 Ques.</td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="p-4 font-bold bg-muted/20">Subjects Wise Q's</td>
                  <td className="p-4 text-xs font-medium">P: 15, C: 15, B: 15, M: 20, MA: 10</td>
                  <td className="p-4 text-xs font-medium">P: 25, C: 25, M: 25</td>
                  <td className="p-4 text-xs font-medium">P: 20, C: 20, Bo: 20, Z: 20</td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="p-4 font-bold bg-muted/20">Syllabus</td>
                  <td colSpan={3} className="p-4 text-center font-semibold text-primary">
                    <a href="https://www.bansal.ac.in" target="_blank" rel="noopener noreferrer" className="hover:underline">
                      Visit www.bansal.ac.in
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 space-y-3 bg-muted/40 p-5 rounded-xl border border-border/60 text-xs text-muted-foreground">
            <p>
              <strong className="text-bansal-black">Legend:</strong> P: Physics, C: Chemistry, B: Biology, M: Mathematics, MA: Mental Ability, Bo: Botany, Z: Zoology
            </p>
            <p>
              <strong className="text-bansal-black">Marking Scheme:</strong> +4 Marks will be given for every Correct Answer, 0 for Not Attempted &amp; -1 for every wrong answer.
            </p>
          </div>
        </div>
      </section>

      {/* Scholarship Matrix */}
      <section className="py-16 md:py-20 bg-bansal-cream border-t border-b border-border/40">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <BansalBadge variant="orange" className="mb-3">
              Scholarship Grid
            </BansalBadge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black">
              Scholarship Based on Performance in BOOST
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Table (1-5) */}
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-md">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-bansal-blue text-white font-semibold">
                    <th className="p-3 border-b border-border text-center">Sr.No.</th>
                    <th className="p-3 border-b border-border">Score in BOOST</th>
                    <th className="p-3 border-b border-border text-center">% Scholarship</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-bansal-black">
                  {[
                    { sr: 1, score: "≥95%", schol: "100%" },
                    { sr: 2, score: "≥90% to <95%", schol: "90%" },
                    { sr: 3, score: "≥85% to <90%", schol: "75%" },
                    { sr: 4, score: "≥75% to <85%", schol: "60%" },
                    { sr: 5, score: "≥65% to <75%", schol: "50%" },
                  ].map((item) => (
                    <tr key={item.sr} className="hover:bg-muted/30">
                      <td className="p-3 text-center font-bold bg-muted/10">{item.sr}</td>
                      <td className="p-3 font-medium">{item.score}</td>
                      <td className="p-3 text-center font-bold text-bansal-orange">{item.schol}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Right Table (6-10) */}
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-md">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-bansal-blue text-white font-semibold">
                    <th className="p-3 border-b border-border text-center">Sr.No.</th>
                    <th className="p-3 border-b border-border">Score in BOOST</th>
                    <th className="p-3 border-b border-border text-center">% Scholarship</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-bansal-black">
                  {[
                    { sr: 6, score: "≥55% to <65%", schol: "40%" },
                    { sr: 7, score: "≥45% to <55%", schol: "25%" },
                    { sr: 8, score: "≥35% to <45%", schol: "10%" },
                    { sr: 9, score: "≥25% to <35%", schol: "No Scholarship" },
                    { sr: 10, score: "<25%", schol: "Not Selected" },
                  ].map((item) => (
                    <tr key={item.sr} className="hover:bg-muted/30">
                      <td className="p-3 text-center font-bold bg-muted/10">{item.sr}</td>
                      <td className="p-3 font-medium">{item.score}</td>
                      <td className="p-3 text-center font-bold text-bansal-orange">{item.schol}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes list */}
          <div className="mt-10 p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <h3 className="font-display font-bold text-lg text-bansal-black border-b border-border/60 pb-2">Important Instructions &amp; Notes</h3>
            <ol className="list-decimal pl-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
              <li>
                If a Student secures Upto 50% Scholarship, he/she will be directly offered that scholarship in Bansal Classes's Classroom Courses in Academic Session 2027-28. If a Student secures more than 50% Scholarship, he/she will be invited for Round-2 where his/her Interview will be scheduled with the Bansal Classes Faculty Team. Based on the recommendation of the Faculty Team, Scholarship may remain the same or be increased/decreased.
              </li>
              <li>
                If a student is eligible for any other scholarship based on other academic achievements like Board Exam, JEE, NEET, Olympiad performances or past association with Bansal Classes, then he/she will be considered for any one scholarship (Best of all).
              </li>
              <li>
                Scholarships will be offered only on the Tuition Fee Part of the total Fee.
              </li>
              <li>
                All the details mentioned in this leaflet are applicable for the Kota Center only. Other Study Centers may have different details.
              </li>
              <li>
                In case of any dispute, the jurisdiction shall be exclusively at Kota (Rajasthan).
              </li>
            </ol>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 md:py-20 bg-bansal-cream">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <BansalBadge variant="blue" className="mb-3">
              Timeline
            </BansalBadge>
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
            <BansalBadge variant="blue" className="mb-3">
              FAQs
            </BansalBadge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black">Common Questions</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => {
              const answer = f.a.replace(/₹99/g, `₹${boost.priceInr}`);
              const question = f.q.replace(/₹99/g, `₹${boost.priceInr}`);
              const isOpen = openFaqIndex === i;
              return (
                <div
                  key={question}
                  className="border border-border/60 rounded-xl bg-card hover:bg-muted/5 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md hover:border-primary/20"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left font-display font-semibold text-bansal-black hover:text-primary transition-colors focus:outline-none"
                  >
                    <span className="pr-4">{question}</span>
                    <span className={`transition-transform duration-300 shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-primary/5 text-primary ${isOpen ? "rotate-180 bg-primary/10" : ""}`}>
                      <ChevronDown className="h-4 w-4" />
                    </span>
                  </button>
                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      isOpen ? "max-h-[300px] border-t border-border/40" : "max-h-0"
                    }`}
                  >
                    <p className="p-5 text-sm text-muted-foreground leading-relaxed bg-background/5">
                      {answer}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 text-center p-8 rounded-2xl bg-gradient-to-r from-bansal-blue/5 via-primary/5 to-bansal-orange/5 border border-border/40">
            <h3 className="font-display font-bold text-lg text-bansal-black mb-2">Still have questions?</h3>
            <p className="text-sm text-muted-foreground mb-4">We are here to help you guide your student's future. Get in touch with our support team.</p>
            <div className="flex justify-center gap-3">
              <a href="mailto:info@bansal.ac.in" className="inline-flex items-center justify-center rounded-lg bg-bansal-blue px-4 py-2 text-xs font-bold text-white hover:bg-bansal-blue/95 transition-colors">
                Email Support
              </a>
              <a href="/centres" className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-xs font-bold text-bansal-black hover:bg-muted transition-colors">
                Contact Study Centres
              </a>
            </div>
          </div>
        </div>
      </section>

    {/* Final CTA */ }
    < section className = "py-16 md:py-20 bg-bansal-blue text-white" >
      <div className="container mx-auto px-4 text-center max-w-2xl">
        <IndianRupee className="h-12 w-12 text-bansal-orange mx-auto mb-4" />
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">
          Your future called — at just ₹{boost.priceInr}.
        </h2>
        <p className="text-white/80 mb-7">
          Register on the official Bansal Classes portal and lock in your BOOST slot today.
        </p>
        <BansalButton variant="cta" className="text-base px-10 py-4" onClick={() => setRegOpen(true)}>
          Fill an Application
        </BansalButton>
        <p className="mt-4 text-xs text-white/60 flex items-center justify-center gap-1">
          <Clock className="h-3 w-3" /> Limited slots every Sunday
        </p>
      </div>
      </section >
    </div >
  );
}
