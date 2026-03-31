import { useState } from "react";
import { ArrowLeft, Eye, Volume2, Maximize2, MoreVertical, Send, Image, ThumbsUp, Heart, Flame, MessageCircle, Mic, MicOff, Video as VideoIcon, Users, Pin, HelpCircle, Settings, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import LiveBadge from "@/components/LiveBadge";

const chatMessages = [
  { name: "Aditya", message: "Sir, I have a doubt in this question I posted in doubts tab", color: "bg-primary" },
  { name: "Ishita", message: "Sir you teach it so well!", color: "bg-secondary" },
  { name: "Karan", message: "Please explain the derivation again", color: "bg-accent" },
  { name: "Vikram Sir", message: "Let me explain step by step...", color: "bg-[hsl(var(--navy))]", isTeacher: true },
  { name: "Divya", message: "Got it! Thank you sir", color: "bg-destructive" },
  { name: "Harsh", message: "Can you share the notes for this topic?", color: "bg-primary" },
  { name: "Vikram Sir", message: "Notes will be uploaded after class", color: "bg-[hsl(var(--navy))]", isTeacher: true },
  { name: "Nisha", message: "When is the next test on this chapter?", color: "bg-secondary" },
];

const LiveClassRoomPage = () => {
  const [message, setMessage] = useState("");

  return (
    <div className="pb-20 lg:pb-0">
      <div className="bg-gradient-to-r from-[hsl(var(--navy))] to-[hsl(var(--navy2))] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-white"><ArrowLeft className="h-5 w-5" /></Link>
          <div>
            <p className="text-sm font-bold text-white">Electrostatics & Capacitors</p>
            <p className="text-[10px] text-white/60">Physics — Vikram Thapar</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LiveBadge />
          <span className="text-xs text-white/70">01:23:45</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        <div className="flex-1">
          <div className="relative aspect-video bg-[#0a0a0a] flex items-center justify-center">
            <div className="text-center">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-accent mx-auto flex items-center justify-center mb-3">
                <span className="text-2xl font-bold text-white">VT</span>
              </div>
              <p className="text-white/60 text-sm">Vikram Thapar is presenting</p>
            </div>
            <div className="absolute top-3 left-3"><LiveBadge /></div>
            <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white">
              <Eye className="h-3 w-3" /> 847 watching
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-2">
              {[{ icon: Users, label: "Participants" }, { icon: Pin, label: "Pin" }, { icon: HelpCircle, label: "Doubts" }, { icon: Settings, label: "Settings" }, { icon: LogOut, label: "Exit" }].map(b => (
                <button key={b.label} className="h-9 w-9 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors" title={b.label}>
                  <b.icon className="h-4 w-4 text-foreground" />
                </button>
              ))}
            </div>
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LiveBadge />
                <span className="text-xs text-white/70">Vikram Thapar — Physics</span>
                <span className="text-xs text-white/50"><Eye className="inline h-3 w-3 mr-0.5" />847</span>
              </div>
              <div className="flex items-center gap-2">
                {[MicOff, VideoIcon, Volume2, Maximize2, MoreVertical].map((Icon, i) => (
                  <button key={i} className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"><Icon className="h-4 w-4" /></button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:w-[340px] border-l border-border bg-card flex flex-col h-[50vh] lg:h-[calc(100vh-57px-48px)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold text-foreground">Live Chat</span>
            </div>
            <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">847 live</span>
          </div>

          <div className="px-4 py-2 text-[10px] text-secondary">
            <p>Harsh, Nisha, Tanvi & 16 others joined</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-3 py-2">
            {chatMessages.map((msg, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className={`h-6 w-6 shrink-0 rounded-full ${msg.color} flex items-center justify-center text-[10px] font-bold text-white`}>
                  {msg.name[0]}
                </div>
                <div>
                  <span className={`text-xs font-bold ${msg.isTeacher ? "text-primary" : "text-foreground"}`}>
                    {msg.name} {msg.isTeacher && <span className="ml-1 rounded bg-primary/10 px-1 py-0.5 text-[8px] font-bold text-primary">TEACHER</span>}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">{msg.message}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 px-4 py-2 border-t border-border">
            {[ThumbsUp, Heart, Flame].map((Icon, i) => (
              <button key={i} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"><Icon className="h-4 w-4" /></button>
            ))}
          </div>

          <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
            <button className="text-muted-foreground hover:text-foreground"><Image className="h-5 w-5" /></button>
            <input type="text" value={message} onChange={e => setMessage(e.target.value)} placeholder="Type your doubt here" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
            <button className="rounded-lg bg-gradient-to-r from-primary to-accent p-2 text-primary-foreground hover:opacity-90 transition-opacity"><Send className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveClassRoomPage;
