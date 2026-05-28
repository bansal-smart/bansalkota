import { useState } from "react";
import { Trophy, Medal, Star, Award, TrendingUp } from "lucide-react";
import BansalCard from "@/components/bansal/BansalCard";
import BansalBadge from "@/components/bansal/BansalBadge";
import BansalButton from "@/components/bansal/BansalButton";
import achievementsHero from "@/assets/achievements-hero.png";

type Topper = {
  name: string;
  rank: string;
  exam: "JEE Advanced" | "JEE Main" | "NEET" | "KVPY" | "NTSE";
  year: number;
  quote?: string;
  initials: string;
};

const TOPPERS: Topper[] = [
  { name: "Aarav Sharma", rank: "AIR 12", exam: "JEE Advanced", year: 2025, initials: "AS", quote: "Bansal's problem-solving culture is unmatched." },
  { name: "Diya Mehta", rank: "AIR 28", exam: "JEE Advanced", year: 2025, initials: "DM", quote: "The faculty here teach concepts that stay for life." },
  { name: "Rohan Verma", rank: "AIR 41", exam: "JEE Advanced", year: 2025, initials: "RV" },
  { name: "Anvi Iyer", rank: "AIR 6", exam: "NEET", year: 2025, initials: "AI", quote: "Daily tests at Bansal made the final NEET feel routine." },
  { name: "Kabir Rao", rank: "AIR 19", exam: "NEET", year: 2025, initials: "KR" },
  { name: "Sneha Kulkarni", rank: "AIR 34", exam: "NEET", year: 2025, initials: "SK" },
  { name: "Ishaan Gupta", rank: "AIR 3", exam: "JEE Main", year: 2025, initials: "IG", quote: "From doubt sessions to mock tests, every hour was purposeful." },
  { name: "Pari Choudhury", rank: "AIR 15", exam: "JEE Main", year: 2025, initials: "PC" },
  { name: "Aryan Nair", rank: "AIR 47", exam: "JEE Main", year: 2025, initials: "AN" },
  { name: "Tanvi Joshi", rank: "AIR 22", exam: "KVPY", year: 2024, initials: "TJ" },
  { name: "Vivaan Patel", rank: "State Topper", exam: "NTSE", year: 2024, initials: "VP" },
  { name: "Riya Khanna", rank: "AIR 9", exam: "JEE Advanced", year: 2024, initials: "RK", quote: "Bansal pushed me to think beyond the syllabus." },
];

const FILTERS = ["All", "JEE Advanced", "JEE Main", "NEET", "KVPY", "NTSE"] as const;

const milestones = [
  { icon: Trophy, value: "30+", label: "AIR Top 100 in JEE Advanced 2025" },
  { icon: Medal, value: "85+", label: "AIR Top 500 in NEET 2025" },
  { icon: Star, value: "1,200+", label: "IIT selections since 1984" },
  { icon: Award, value: "40+", label: "Years of teaching excellence" },
];

export default function AchievementsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const filtered = filter === "All" ? TOPPERS : TOPPERS.filter((t) => t.exam === filter);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[hsl(var(--navy))] text-white py-14 md:py-20">
        <img src={achievementsHero} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--navy))]/85 via-[hsl(var(--navy2))]/75 to-[hsl(222,47%,15%)]/90" />
        <div className="container relative z-10 mx-auto px-4 text-center max-w-3xl">
          <BansalBadge variant="orange" className="mb-4">Our Achievements</BansalBadge>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Toppers Born at <span className="text-bansal-orange">Bansal Classes</span>
          </h1>
          <p className="text-white/85 text-lg">
            Four decades. Thousands of IIT &amp; NEET selections. Here are some of the recent stars who walked through our doors.
          </p>
        </div>
      </section>

      {/* Milestones */}
      <section className="py-14 -mt-10">
        <div className="container mx-auto px-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {milestones.map((m) => (
              <BansalCard key={m.label} className="text-center">
                <div className="h-12 w-12 mx-auto rounded-lg bg-bansal-orange/10 text-bansal-orange flex items-center justify-center mb-3">
                  <m.icon className="h-6 w-6" />
                </div>
                <div className="font-display text-3xl font-bold text-bansal-blue">{m.value}</div>
                <p className="text-xs text-muted-foreground mt-2">{m.label}</p>
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* Toppers wall */}
      <section className="py-14">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <BansalBadge variant="blue" className="mb-3">Recent Toppers</BansalBadge>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-bansal-black">
              The Wall of Fame
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  filter === f
                    ? "bg-bansal-blue text-white"
                    : "bg-bansal-blue-light text-bansal-blue hover:bg-bansal-blue hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <BansalCard key={t.name + t.rank} className="relative">
                <div className="absolute top-4 right-4">
                  <BansalBadge variant="orange">{t.year}</BansalBadge>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-14 w-14 rounded-full bg-bansal-blue text-white font-display font-bold text-lg flex items-center justify-center">
                    {t.initials}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-bansal-black">{t.name}</h3>
                    <p className="text-xs text-muted-foreground">{t.exam}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-4 w-4 text-bansal-orange" />
                  <span className="font-display font-bold text-bansal-blue text-xl">{t.rank}</span>
                </div>
                {t.quote && (
                  <p className="text-sm text-muted-foreground italic border-l-2 border-bansal-orange pl-3 leading-relaxed">
                    "{t.quote}"
                  </p>
                )}
              </BansalCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-bansal-blue text-white">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <TrendingUp className="h-12 w-12 text-bansal-orange mx-auto mb-4" />
          <h2 className="font-display text-3xl font-bold mb-3">
            Be the next name on this wall.
          </h2>
          <p className="text-white/80 mb-6">
            Start your journey with India's most trusted JEE/NEET coaching. Win up to 90% scholarship via BOOST.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="/boost"><BansalButton variant="cta">Register for BOOST</BansalButton></a>
            <a href="/contact"><BansalButton variant="ghost-white">Talk to Counsellor</BansalButton></a>
          </div>
        </div>
      </section>
    </div>
  );
}
