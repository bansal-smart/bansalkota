import { useState } from "react";
import { Trophy, Medal, Crown } from "lucide-react";

const filters = ["All India", "My Batch", "My Centre", "Weekly", "Monthly"];

const topThree = [
  { rank: 2, name: "Ishita Bansal", score: 4820, avatar: "IB", color: "from-muted to-muted-foreground" },
  { rank: 1, name: "Karan Malhotra", score: 5100, avatar: "KM", color: "from-accent to-primary" },
  { rank: 3, name: "Divya Nair", score: 4650, avatar: "DN", color: "from-primary-dark to-accent" },
];

const rankings = Array.from({ length: 10 }, (_, i) => ({
  rank: i + 4,
  name: ["Harsh Agarwal", "Nisha Reddy", "Saurabh Pillai", "Tanvi Mehta", "Ravi Shankar", "Pooja Desai", "Aditya Rajan", "Shreya Gupta", "Manish Tiwari", "Ayesha Khan"][i],
  batch: ["Alpha", "Beta", "Alpha", "Gamma", "Beta", "Alpha", "Beta", "Gamma", "Alpha", "Beta"][i],
  score: 4600 - i * 80,
  accuracy: 92 - i * 1.5,
  tests: 25 - i,
  isYou: i === 6,
}));

const LeaderboardPage = () => {
  const [activeFilter, setActiveFilter] = useState(0);

  return (
    <div className="pb-20 lg:pb-0">
      <div className="bg-gradient-to-br from-[hsl(var(--navy))] to-[hsl(var(--navy2))] grid-texture px-4 pt-4 pb-5">
        <h1 className="text-lg font-black font-display text-white flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" /> Leaderboard
        </h1>
      </div>

      <div className="p-4 lg:p-6 space-y-5">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map((f, i) => (
            <button key={f} onClick={() => setActiveFilter(i)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${i === activeFilter ? "bg-gradient-to-r from-primary to-accent text-primary-foreground" : "border border-border text-muted-foreground hover:bg-muted/30"}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-end justify-center gap-4 py-6 animate-fade-in-up">
          {topThree.map((p) => (
            <div key={p.rank} className={`text-center ${p.rank === 1 ? "order-2" : p.rank === 2 ? "order-1" : "order-3"}`}>
              <div className="relative">
                {p.rank === 1 && <Crown className="h-5 w-5 text-accent absolute -top-5 left-1/2 -translate-x-1/2" />}
                <div className={`h-16 w-16 mx-auto rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center border-2 ${p.rank === 1 ? "border-accent h-20 w-20" : "border-white/30"}`}>
                  <span className="text-lg font-bold text-white">{p.avatar}</span>
                </div>
              </div>
              <p className="text-xs font-bold text-foreground mt-2">{p.name}</p>
              <p className="text-xs text-primary font-bold">{p.score}</p>
              <div className={`mt-2 mx-auto rounded-t-lg ${p.rank === 1 ? "h-20 w-20 bg-accent/20" : p.rank === 2 ? "h-14 w-16 bg-muted" : "h-10 w-16 bg-primary-light"} flex items-center justify-center`}>
                <span className="text-lg font-black font-display text-foreground">#{p.rank}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-in-up">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border bg-muted/30">{["Rank", "Student", "Batch", "Score", "Accuracy", "Tests"].map(h => <th key={h} className="p-3 text-left font-bold text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {rankings.map(r => (
                  <tr key={r.rank} className={`border-b border-border last:border-0 ${r.isYou ? "bg-primary-light" : "hover:bg-muted/20"}`}>
                    <td className="p-3 font-bold text-foreground">#{r.rank}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">{r.name.split(" ").map(n => n[0]).join("")}</div>
                        <span className={`font-semibold ${r.isYou ? "text-primary" : "text-foreground"}`}>{r.name} {r.isYou && <span className="text-[10px] text-primary">(You)</span>}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{r.batch}</td>
                    <td className="p-3 font-bold text-foreground">{r.score}</td>
                    <td className="p-3 font-bold text-primary">{r.accuracy.toFixed(1)}%</td>
                    <td className="p-3 text-muted-foreground">{r.tests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="sticky bottom-20 lg:bottom-4 bg-gradient-to-r from-primary to-accent rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
          <span className="text-xs font-bold text-primary-foreground">Your Position</span>
          <span className="text-sm font-black font-display text-primary-foreground">#10</span>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
