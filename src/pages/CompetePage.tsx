import { useState } from "react";
import { Swords, Trophy, Flame, Zap, Crown, Sparkles } from "lucide-react";

const CompetePage = () => {
  const [matchState, setMatchState] = useState<"lobby" | "playing" | "result">("playing");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  return (
    <div className="pb-20 lg:pb-0 min-h-[calc(100vh-57px)]" style={{ background: "hsl(var(--navy))" }}>
      <div className="grid-texture p-4 lg:p-6 space-y-5">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-black font-display text-white flex items-center justify-center gap-2">
            <Swords className="h-6 w-6 text-accent" /> Compete
          </h1>
          <p className="text-xs text-white/60 mt-1">Challenge peers, earn India rank</p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent/20 px-3 py-1">
            <Trophy className="h-3 w-3 text-accent" />
            <span className="text-xs font-bold text-accent">Your Rank: #1,13,002</span>
          </div>
        </div>

        {matchState === "lobby" && (
          <div className="text-center space-y-4">
            <button onClick={() => setMatchState("playing")} className="rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-dark transition-colors">
              Find Opponent
            </button>
            <button className="block mx-auto text-xs text-white/60 underline hover:text-white/80">Practice Solo</button>
          </div>
        )}

        {matchState === "playing" && (
          <>
            {/* Battle Arena */}
            <div className="flex items-center justify-center gap-4 py-4 relative">
              <Sparkles className="absolute top-2 left-8 h-4 w-4 text-accent/40 animate-float" />
              <Sparkles className="absolute bottom-4 right-12 h-3 w-3 text-primary/40 animate-float-delayed" />
              <Sparkles className="absolute top-8 right-6 h-5 w-5 text-secondary/30 animate-float" />

              {/* You */}
              <div className="text-center">
                <div className="relative">
                  <Crown className="h-4 w-4 text-accent absolute -top-3 left-1/2 -translate-x-1/2" />
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary to-primary-dark border-2 border-primary flex items-center justify-center mx-auto">
                    <span className="text-lg font-bold text-white">AV</span>
                  </div>
                </div>
                <p className="text-xs font-bold text-white mt-1.5">You</p>
                <div className="flex gap-1 justify-center mt-1.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <span key={i} className={`h-2 w-5 rounded-full ${i <= 4 ? "bg-secondary" : "bg-white/20"}`} />
                  ))}
                </div>
              </div>

              {/* VS */}
              <div className="h-12 w-12 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                <span className="text-sm font-black text-white">VS</span>
              </div>

              {/* Opponent */}
              <div className="text-center">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[hsl(271,91%,65%)] to-[hsl(271,81%,45%)] border-2 border-[hsl(271,91%,65%)] flex items-center justify-center mx-auto">
                  <span className="text-lg font-bold text-white">AS</span>
                </div>
                <p className="text-xs font-bold text-white mt-1.5">Aastha</p>
                <div className="flex gap-1 justify-center mt-1.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <span key={i} className={`h-2 w-5 rounded-full ${i <= 2 ? "bg-secondary" : "bg-white/20"}`} />
                  ))}
                </div>
              </div>
            </div>

            {/* Question Box */}
            <div className="rounded-2xl bg-card overflow-hidden">
              <div className="bg-[hsl(var(--navy2))] px-4 py-2 text-center">
                <span className="text-xs font-bold text-white">Question 1 of 5</span>
              </div>
              <div className="p-5">
                <p className="text-sm font-medium text-foreground mb-5 leading-relaxed">
                  Which of the following statements is correct regarding the periodic table?
                </p>
                <div className="space-y-2.5">
                  {["Electronegativity increases down a group", "Ionization energy decreases across a period", "Atomic radius increases across a period", "Electron affinity generally increases across a period"].map((opt, i) => (
                    <button key={i} onClick={() => setSelectedOption(i)} className={`flex items-center gap-3 w-full rounded-xl border p-3.5 text-left transition-all ${selectedOption === i ? "border-primary bg-primary-light" : "border-border hover:border-primary/30"}`}>
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selectedOption === i ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <span className="text-xs font-medium text-foreground">{opt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 backdrop-blur p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-white/50 uppercase">India Rank</p>
                  <p className="text-lg font-black font-display text-white">1,13,002</p>
                </div>
                <Trophy className="h-6 w-6 text-accent/60" />
              </div>
              <div className="rounded-xl bg-white/5 backdrop-blur p-4">
                <p className="text-[10px] text-white/50 uppercase">Streak</p>
                <div className="flex items-center gap-2 mt-1">
                  <Flame className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-white">10 / 10 mins</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Zap className="h-4 w-4 text-secondary" />
                  <span className="text-xs font-bold text-white">2 / 5 questions</span>
                </div>
              </div>
            </div>
          </>
        )}

        {matchState === "result" && (
          <div className="text-center space-y-4">
            <div className="rounded-2xl bg-card p-6">
              <h2 className="text-xl font-black font-display text-foreground">You Won!</h2>
              <p className="text-sm text-muted-foreground mt-1">You 4 vs Aastha 2</p>
              <span className="inline-block mt-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold text-accent">+50 XP earned</span>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setMatchState("lobby"); setSelectedOption(null); }} className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-dark">Play Again</button>
              <button onClick={() => setMatchState("lobby")} className="rounded-xl border border-white/20 px-6 py-2.5 text-xs font-bold text-white hover:bg-white/10">Back to Home</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetePage;
