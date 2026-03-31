import { useState } from "react";
import { Camera, Flame, Target, ClipboardCheck, Trophy, Award, Zap, BookOpen, Star, Crown, CheckCircle2, Shield } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const tabItems = ["Personal Info", "Subscription", "Achievements", "Settings"];

const achievements = [
  { name: "First Streak", icon: Flame, earned: true, color: "bg-primary" },
  { name: "First Test", icon: ClipboardCheck, earned: true, color: "bg-secondary" },
  { name: "Top 100", icon: Trophy, earned: true, color: "bg-accent" },
  { name: "Speed Solver", icon: Zap, earned: false, color: "bg-muted" },
  { name: "Bookworm", icon: BookOpen, earned: false, color: "bg-muted" },
  { name: "Perfect Score", icon: Target, earned: true, color: "bg-primary" },
  { name: "Star Student", icon: Star, earned: false, color: "bg-muted" },
  { name: "Champion", icon: Crown, earned: false, color: "bg-muted" },
];

const ProfilePage = () => {
  const { user } = useAppStore();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="pb-20 lg:pb-0">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-primary to-primary-dark grid-texture p-6 text-white text-center">
        <div className="relative inline-block">
          <div className="h-20 w-20 rounded-full bg-white/20 mx-auto flex items-center justify-center text-2xl font-bold">
            {user?.full_name?.split(" ").map(n => n[0]).join("") || "U"}
          </div>
          <button className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-white flex items-center justify-center shadow"><Camera className="h-3.5 w-3.5 text-primary" /></button>
        </div>
        <h2 className="text-lg font-black font-display mt-3">{user?.full_name || "Student"}</h2>
        <div className="flex items-center justify-center gap-2 mt-1">
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">IIT JEE</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">Class 12</span>
        </div>
        <p className="text-xs opacity-70 mt-1">New Delhi, India · Member since Jan 2026</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 p-4">
        {[
          { icon: Flame, value: "8 day", label: "Streak" },
          { icon: ClipboardCheck, value: "23", label: "Tests" },
          { icon: Target, value: "87%", label: "Accuracy" },
          { icon: Trophy, value: "#3", label: "Rank" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
            <s.icon className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-sm font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 overflow-x-auto no-scrollbar">
        {tabItems.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)} className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${i === activeTab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 lg:p-6">
        {activeTab === 0 && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-bold font-display text-foreground">Personal Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Full Name", value: user?.full_name || "" },
                { label: "Email", value: user?.email || "" },
                { label: "Phone", value: "+91 98765 43210" },
                { label: "Date of Birth", value: "15 Mar 2008" },
                { label: "City", value: "New Delhi" },
                { label: "Target Exam", value: "IIT JEE" },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{f.label}</label>
                  <input type="text" defaultValue={f.value} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" />
                </div>
              ))}
            </div>
            <button className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-dark transition-colors">Save Changes</button>
          </div>
        )}

        {activeTab === 1 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/20 bg-primary-light p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-foreground">Pro Plan</p>
                  <p className="text-xs text-muted-foreground">Active until Dec 31, 2026</p>
                </div>
                <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">ACTIVE</span>
              </div>
              <div className="space-y-2 mb-4">
                {[
                  { label: "Lectures Watched", value: 45, total: 120 },
                  { label: "Tests Taken", value: 23, total: 50 },
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex justify-between text-xs mb-1"><span className="text-foreground">{m.label}</span><span className="font-bold text-foreground">{m.value}/{m.total}</span></div>
                    <div className="h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${(m.value / m.total) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
              <button className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary-dark transition-colors">Upgrade Plan</button>
            </div>
          </div>
        )}

        {activeTab === 2 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold font-display text-foreground mb-4">Achievements</h3>
            <div className="grid grid-cols-4 gap-3">
              {achievements.map(a => (
                <div key={a.name} className={`rounded-xl p-3 text-center ${a.earned ? "" : "opacity-40"}`}>
                  <div className={`h-12 w-12 rounded-full ${a.earned ? a.color : "bg-muted"} mx-auto flex items-center justify-center mb-2`}>
                    <a.icon className={`h-5 w-5 ${a.earned ? "text-white" : "text-muted-foreground"}`} />
                  </div>
                  <p className="text-[10px] font-bold text-foreground">{a.name}</p>
                  {a.earned && <CheckCircle2 className="h-3 w-3 text-secondary mx-auto mt-1" />}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 3 && (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="text-sm font-bold font-display text-foreground">Settings</h3>
            {[
              { label: "Push Notifications", desc: "Receive test reminders and class alerts" },
              { label: "Email Notifications", desc: "Weekly performance reports" },
              { label: "Dark Mode", desc: "Coming soon" },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div><p className="text-xs font-semibold text-foreground">{s.label}</p><p className="text-[10px] text-muted-foreground">{s.desc}</p></div>
                <div className="h-5 w-9 rounded-full bg-primary relative cursor-pointer"><div className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all" /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
