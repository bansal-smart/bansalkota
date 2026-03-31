import { useState } from "react";
import { ArrowLeft, Play, CheckCircle2, Video, ClipboardCheck, FileText, MessageCircle, Star, Users, Shield, Share2, Heart, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import LiveBadge from "@/components/LiveBadge";

const syllabus = [
  { chapter: "Electrostatics", topics: ["Electric Charge", "Coulomb's Law", "Electric Field", "Gauss's Law"], expanded: true },
  { chapter: "Current Electricity", topics: ["Ohm's Law", "Kirchhoff's Laws", "Wheatstone Bridge"], expanded: false },
  { chapter: "Magnetism", topics: ["Biot-Savart Law", "Ampere's Law", "Magnetic Moment"], expanded: false },
];

const highlights = [
  { icon: Video, label: "120 Lectures", value: "120" },
  { icon: Play, label: "45 Live Classes", value: "45" },
  { icon: ClipboardCheck, label: "30 Tests", value: "30" },
  { icon: FileText, label: "PDF Notes", value: "50+" },
];

const CourseDetailPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [expandedChapter, setExpandedChapter] = useState(0);
  const tabs = ["About", "Educators", "Schedule", "Testimonials"];

  return (
    <div className="pb-20 lg:pb-0">
      {/* Breadcrumb */}
      <div className="px-4 py-3 text-xs text-muted-foreground">
        <Link to="/dashboard" className="hover:text-primary">Home</Link> / <Link to="/courses" className="hover:text-primary">Courses</Link> / <span className="text-foreground font-medium">JEE Physics Booster</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 px-4 lg:px-6">
        {/* Main Content */}
        <div className="flex-1 space-y-5">
          {/* Hero */}
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary-dark relative h-52 flex items-center justify-center overflow-hidden">
            <button className="h-16 w-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors">
              <Play className="h-7 w-7 text-white ml-1" />
            </button>
            <div className="absolute top-3 left-3 flex gap-2">
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">PREVIEW</span>
              <LiveBadge />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-border">
            {tabs.map((tab, i) => (
              <button key={tab} onClick={() => setActiveTab(i)} className={`pb-3 text-sm font-semibold transition-colors ${i === activeTab ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 0 && (
            <div className="space-y-5">
              {/* Highlights */}
              <div className="grid grid-cols-4 gap-3">
                {highlights.map(h => (
                  <div key={h.label} className="rounded-xl border border-border p-3 text-center">
                    <h.icon className="h-5 w-5 text-primary mx-auto mb-1" />
                    <p className="text-xs font-bold text-foreground">{h.value}</p>
                    <p className="text-[10px] text-muted-foreground">{h.label}</p>
                  </div>
                ))}
              </div>

              {/* What you'll learn */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-bold font-display text-foreground mb-3">What you'll learn</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {["Complete JEE Physics syllabus coverage", "Previous year questions with solutions", "Daily practice problems & tests", "Live doubt resolution sessions", "Performance analytics & weak topic identification", "Exam strategy & time management tips"].map(item => (
                    <div key={item} className="flex items-start gap-2 text-xs text-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0 mt-0.5" />{item}</div>
                  ))}
                </div>
              </div>

              {/* Syllabus Accordion */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-bold font-display text-foreground mb-3">Syllabus</h3>
                <div className="space-y-2">
                  {syllabus.map((ch, i) => (
                    <div key={ch.chapter} className="rounded-xl border border-border overflow-hidden">
                      <button onClick={() => setExpandedChapter(expandedChapter === i ? -1 : i)} className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/30 transition-colors">
                        <span className="text-xs font-bold text-foreground">{ch.chapter}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">{ch.topics.length} topics</span>
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedChapter === i ? "rotate-180" : ""}`} />
                        </div>
                      </button>
                      {expandedChapter === i && (
                        <div className="border-t border-border px-4 py-2 space-y-1">
                          {ch.topics.map(t => (
                            <p key={t} className="text-xs text-muted-foreground py-1 pl-4">• {t}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enrollment Card */}
        <div className="lg:w-[300px] shrink-0">
          <div className="sticky top-[70px] rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold font-display text-foreground">JEE Physics Complete — Booster Batch</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-display text-foreground">₹1,300</span>
              <span className="text-sm text-muted-foreground line-through">₹2,500</span>
              <span className="text-xs font-bold text-secondary">/month</span>
            </div>
            <span className="inline-block rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">47% OFF</span>

            <button className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary-dark transition-colors">Enroll Now</button>
            <button className="w-full text-center text-xs text-secondary font-semibold hover:underline">Try Free for 7 days</button>

            <div className="space-y-2 pt-2 border-t border-border">
              {["120 Lectures", "45 Live Classes", "30 Tests", "PDF Notes", "Doubt Support"].map(item => (
                <div key={item} className="flex items-center gap-2 text-xs text-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-secondary" />{item}</div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-2 border-t border-border">
              <Shield className="h-3 w-3" /> 7-day money-back guarantee
            </div>

            <div className="flex gap-3 pt-2">
              <button className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-muted/30 flex items-center justify-center gap-1"><Share2 className="h-3 w-3" /> Share</button>
              <button className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-muted/30 flex items-center justify-center gap-1"><Heart className="h-3 w-3" /> Wishlist</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailPage;
