import { useState } from "react";
import { Target, Clock, Trophy, ClipboardCheck, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import StatCard from "@/components/StatCard";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from "recharts";

const subjectTabs = ["Overall", "Physics", "Chemistry", "Mathematics", "Biology"];

const scoreTrend = [
  { date: "Mar 1", score: 180 }, { date: "Mar 5", score: 210 }, { date: "Mar 10", score: 195 },
  { date: "Mar 15", score: 240 }, { date: "Mar 20", score: 260 }, { date: "Mar 25", score: 285 }, { date: "Mar 30", score: 304 },
];

const radarData = [
  { subject: "Speed", you: 85, avg: 70 }, { subject: "Accuracy", you: 87, avg: 72 },
  { subject: "Attempts", you: 92, avg: 75 }, { subject: "Consistency", you: 78, avg: 68 }, { subject: "Improvement", you: 90, avg: 65 },
];

const studyTime = [
  { day: "Mon", hours: 5.5 }, { day: "Tue", hours: 7.2 }, { day: "Wed", hours: 4.8 },
  { day: "Thu", hours: 6.5 }, { day: "Fri", hours: 8.1 }, { day: "Sat", hours: 3.2 }, { day: "Sun", hours: 5.0 },
];

const weakTopics = [
  { topic: "Thermodynamics", accuracy: 52 }, { topic: "Organic Reactions", accuracy: 58 }, { topic: "Rotational Motion", accuracy: 61 },
];

const strongTopics = [
  { topic: "Electrostatics", accuracy: 94 }, { topic: "Calculus", accuracy: 91 }, { topic: "Stoichiometry", accuracy: 89 },
];

const testHistory = [
  { name: "JEE Mock #12", date: "Mar 28", score: "304/360", rank: "#3", percentile: "99.2%", time: "2h 45m" },
  { name: "Chemistry Test", date: "Mar 25", score: "85/120", rank: "#7", percentile: "96.8%", time: "42m" },
  { name: "JEE Mock #11", date: "Mar 20", score: "285/360", rank: "#5", percentile: "98.5%", time: "2h 50m" },
  { name: "Physics Test", date: "Mar 15", score: "92/120", rank: "#2", percentile: "99.5%", time: "38m" },
];

const chapterBubbles = [
  { name: "Electrostatics", size: 48, accuracy: 94 }, { name: "Mechanics", size: 44, accuracy: 82 },
  { name: "Thermo", size: 36, accuracy: 52 }, { name: "Optics", size: 40, accuracy: 76 },
  { name: "Organic", size: 42, accuracy: 58 }, { name: "Calculus", size: 38, accuracy: 91 },
  { name: "P-Block", size: 34, accuracy: 64 }, { name: "Algebra", size: 40, accuracy: 85 },
];

const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState(0);

  const getBubbleColor = (acc: number) => acc >= 80 ? "bg-secondary/20 text-secondary border-secondary/30" : acc >= 60 ? "bg-accent/20 text-accent border-accent/30" : "bg-destructive/20 text-destructive border-destructive/30";

  return (
    <div className="pb-20 lg:pb-0">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-primary-dark grid-texture p-6 text-white">
        <h1 className="text-lg font-black font-display mb-4">My Performance Analytics</h1>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { icon: ClipboardCheck, value: "23", label: "Total Tests" },
            { icon: Target, value: "87%", label: "Avg Accuracy" },
            { icon: Trophy, value: "#3", label: "Best Rank" },
            { icon: Clock, value: "142h", label: "Study Hours" },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-xl bg-white/15 backdrop-blur p-3">
              <kpi.icon className="h-4 w-4 text-white/80 mb-1" />
              <p className="text-xl font-black font-display text-white">{kpi.value}</p>
              <p className="text-[10px] text-white/70 font-medium">{kpi.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 lg:p-6 space-y-5">
        {/* Score Trend */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold font-display text-foreground mb-4">Score Trend — Last 30 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={scoreTrend}>
              <defs><linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(24,95%,53%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(24,95%,53%)" stopOpacity={0} /></linearGradient></defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="score" stroke="hsl(24,95%,53%)" fill="url(#scoreGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Subject Tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {subjectTabs.map((tab, i) => (
            <button key={tab} onClick={() => setActiveTab(i)} className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${i === activeTab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Chapter Heatmap */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold font-display text-foreground mb-4">Chapter Heatmap</h3>
          <div className="flex flex-wrap gap-3">
            {chapterBubbles.map(ch => (
              <div key={ch.name} className={`rounded-full border flex items-center justify-center ${getBubbleColor(ch.accuracy)}`} style={{ width: ch.size + 20, height: ch.size + 20 }}>
                <div className="text-center"><p className="text-[8px] font-bold leading-tight">{ch.name}</p><p className="text-[10px] font-black">{ch.accuracy}%</p></div>
              </div>
            ))}
          </div>
        </div>

        {/* Radar Chart */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold font-display text-foreground mb-4">Accuracy Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis tick={{ fontSize: 9 }} />
              <Radar name="You" dataKey="you" stroke="hsl(24,95%,53%)" fill="hsl(24,95%,53%)" fillOpacity={0.3} />
              <Radar name="Average" dataKey="avg" stroke="hsl(215,16%,47%)" fill="hsl(215,16%,47%)" fillOpacity={0.1} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Test History */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-5 pb-3"><h3 className="text-sm font-bold font-display text-foreground">Test History</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border">{["Test", "Date", "Score", "Rank", "%ile", "Time"].map(h => <th key={h} className="px-5 py-2 text-left font-bold text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {testHistory.map(t => (
                  <tr key={t.name} className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer">
                    <td className="px-5 py-3 font-semibold text-foreground">{t.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{t.date}</td>
                    <td className="px-5 py-3 font-bold text-foreground">{t.score}</td>
                    <td className="px-5 py-3 font-bold text-primary">{t.rank}</td>
                    <td className="px-5 py-3 font-bold text-secondary">{t.percentile}</td>
                    <td className="px-5 py-3 text-muted-foreground">{t.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Study Time */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold font-display text-foreground mb-4">Study Time — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={studyTime}>
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 11 }} />
              <Bar dataKey="hours" fill="hsl(24,95%,53%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weak vs Strong */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5">
            <h3 className="text-sm font-bold text-destructive flex items-center gap-1.5 mb-3"><TrendingDown className="h-4 w-4" /> Weak Topics</h3>
            {weakTopics.map(t => (
              <div key={t.topic} className="flex justify-between text-xs mb-2"><span className="text-foreground">{t.topic}</span><span className="font-bold text-destructive">{t.accuracy}%</span></div>
            ))}
          </div>
          <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-5">
            <h3 className="text-sm font-bold text-secondary flex items-center gap-1.5 mb-3"><TrendingUp className="h-4 w-4" /> Strong Topics</h3>
            {strongTopics.map(t => (
              <div key={t.topic} className="flex justify-between text-xs mb-2"><span className="text-foreground">{t.topic}</span><span className="font-bold text-secondary">{t.accuracy}%</span></div>
            ))}
          </div>
        </div>

        <button className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary-dark transition-colors flex items-center justify-center gap-2">
          Generate AI Study Plan <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default AnalyticsPage;
