import { Trophy, Target, TrendingUp, ArrowRight, BarChart3, RotateCcw, Share2, Home, Brain } from "lucide-react";
import { Link } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const comparisonData = [
  { name: "Mock 2", you: 180, topper: 320, avg: 200 },
  { name: "Mock 3", you: 210, topper: 330, avg: 205 },
  { name: "Mock 5", you: 240, topper: 340, avg: 210 },
  { name: "Mock 7", you: 260, topper: 335, avg: 208 },
  { name: "Mock 9", you: 285, topper: 345, avg: 215 },
  { name: "Mock 12", you: 304, topper: 348, avg: 212 },
];

const subjects = [
  { name: "Physics", attempted: "30/30", correct: 28, incorrect: 2, score: "110/120", accuracy: 93 },
  { name: "Chemistry", attempted: "28/30", correct: 24, incorrect: 4, score: "92/120", accuracy: 86 },
  { name: "Mathematics", attempted: "25/30", correct: 22, incorrect: 3, score: "85/120", accuracy: 88 },
];

const chapters = [
  { name: "Electricity & Magnetism", strength: 5 },
  { name: "Optics & Waves", strength: 4 },
  { name: "Newton's Laws", strength: 3 },
  { name: "Current Electricity", strength: 2 },
  { name: "Thermodynamics", strength: 1 },
];

const weakTopics = [
  { topic: "Thermodynamics", accuracy: 52 },
  { topic: "Rotational Motion", accuracy: 61 },
  { topic: "P-Block Chemistry", accuracy: 64 },
];

const TestResultPage = () => (
  <div className="pb-20 lg:pb-0">
    {/* Hero */}
    <div className="bg-gradient-to-br from-primary to-primary-dark grid-texture p-6 text-white text-center">
      <h1 className="text-2xl font-black font-display mb-4">Your Result</h1>
      <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
        <div className="rounded-xl bg-white/15 backdrop-blur p-3">
          <p className="text-[10px] font-medium opacity-80">Total Score</p>
          <p className="text-2xl font-black font-display">104</p>
          <p className="text-xs opacity-70">/ 360</p>
        </div>
        <div className="rounded-xl bg-white/15 backdrop-blur p-3">
          <p className="text-[10px] font-medium opacity-80">Correct</p>
          <p className="text-2xl font-black font-display text-[hsl(var(--secondary))]">+112</p>
        </div>
        <div className="rounded-xl bg-white/15 backdrop-blur p-3">
          <p className="text-[10px] font-medium opacity-80">Incorrect</p>
          <p className="text-2xl font-black font-display text-[hsl(var(--destructive))]">-8</p>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-6">
        <div><p className="text-3xl font-black font-display text-[hsl(var(--secondary))]">87%</p><p className="text-xs opacity-70">Accuracy</p></div>
        <div><p className="text-3xl font-black font-display">83/90</p><p className="text-xs opacity-70">Attempted</p></div>
      </div>
    </div>

    {/* Rank Strip */}
    <div className="bg-[hsl(var(--navy))] grid-texture px-4 py-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div><p className="text-[10px] text-white/60 mb-1">Batch Rank</p><p className="text-lg font-black font-display text-accent"><Trophy className="inline h-4 w-4 mr-1" />#3</p></div>
        <div className="border-x border-white/10"><p className="text-[10px] text-white/60 mb-1">Centre %ile</p><p className="text-lg font-black font-display text-secondary">94.5</p></div>
        <div><p className="text-[10px] text-white/60 mb-1">All India %ile</p><p className="text-lg font-black font-display text-accent">99.8</p></div>
      </div>
    </div>

    <div className="p-4 lg:p-6 space-y-5">
      {/* Subject Breakdown */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold font-display text-foreground mb-4">Subject-wise Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">{["Subject", "Attempted", "Correct", "Incorrect", "Score", "Accuracy"].map(h => <th key={h} className="p-2 text-left font-bold text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody>
              {subjects.map(s => (
                <tr key={s.name} className="border-b border-border last:border-0">
                  <td className="p-2 font-semibold text-foreground">{s.name}</td>
                  <td className="p-2 text-muted-foreground">{s.attempted}</td>
                  <td className="p-2 text-secondary font-bold">{s.correct}</td>
                  <td className="p-2 text-destructive font-bold">{s.incorrect}</td>
                  <td className="p-2 font-bold text-foreground">{s.score}</td>
                  <td className="p-2 font-bold text-primary">{s.accuracy}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 space-y-2">
          {subjects.map(s => (
            <div key={s.name}>
              <div className="flex justify-between text-xs mb-1"><span className="text-foreground font-medium">{s.name}</span><span className="font-bold text-foreground">{s.accuracy}%</span></div>
              <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${s.accuracy}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* Chapter-wise */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold font-display text-foreground mb-4">Chapter-wise Performance</h3>
        <div className="space-y-3">
          {chapters.map(ch => (
            <div key={ch.name} className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{ch.name}</span>
              <div className="flex gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={`h-2.5 w-2.5 rounded-full ${i < ch.strength ? (ch.strength >= 4 ? "bg-secondary" : ch.strength >= 3 ? "bg-accent" : "bg-destructive") : "bg-muted"}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Graph */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold font-display text-foreground mb-4">Your Performance vs Others</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={comparisonData}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, 360]} />
            <Tooltip contentStyle={{ fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="you" stroke="hsl(24,95%,53%)" strokeWidth={2} dot={{ r: 3 }} name="You" />
            <Line type="monotone" dataKey="topper" stroke="hsl(38,92%,50%)" strokeWidth={2} dot={{ r: 3 }} name="Topper" />
            <Line type="monotone" dataKey="avg" stroke="hsl(215,16%,47%)" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Average" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* AI Insight */}
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">AI Analysis</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Based on your performance, focus on:</p>
        <ul className="space-y-1.5">
          {weakTopics.map(t => (
            <li key={t.topic} className="flex items-center justify-between text-xs">
              <span className="text-foreground font-medium">{t.topic}</span>
              <span className="font-bold text-destructive">{t.accuracy}% accuracy</span>
            </li>
          ))}
        </ul>
        <button className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary-dark transition-colors">
          Get AI Study Plan <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: BarChart3, label: "Detailed Analysis", variant: "primary" },
          { icon: RotateCcw, label: "Reattempt", variant: "outline" },
          { icon: Share2, label: "Share Score", variant: "outline" },
          { icon: Home, label: "Back to Home", variant: "outline" },
        ].map(a => (
          <Link key={a.label} to={a.variant === "outline" && a.label === "Back to Home" ? "/dashboard" : "#"} className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-colors ${a.variant === "primary" ? "bg-primary text-primary-foreground hover:bg-primary-dark" : "border border-border text-foreground hover:bg-muted/30"}`}>
            <a.icon className="h-3.5 w-3.5" /> {a.label}
          </Link>
        ))}
      </div>
    </div>
  </div>
);

export default TestResultPage;
