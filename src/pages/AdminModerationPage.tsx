import { Shield, AlertTriangle, MessageCircle, Flag, Check, X, Eye } from "lucide-react";

const reports = [
  { id: 1, type: "Doubt", content: "Inappropriate language in doubt question", reporter: "Ishita Patel", reported: "Kabir Singh", date: "2 hrs ago", severity: "high" },
  { id: 2, type: "Chat", content: "Spam messages in live class chat", reporter: "System", reported: "Unknown User", date: "5 hrs ago", severity: "medium" },
  { id: 3, type: "Review", content: "Fake review with misleading content", reporter: "Vikram Thapar", reported: "Arjun Nair", date: "1 day ago", severity: "low" },
  { id: 4, type: "Doubt", content: "Sharing exam paper screenshots", reporter: "Priya Mehta", reported: "Dev Ranganathan", date: "2 days ago", severity: "high" },
  { id: 5, type: "Profile", content: "Inappropriate profile picture", reporter: "System", reported: "Riya Gupta", date: "3 days ago", severity: "medium" },
];

const severityColors: Record<string, string> = { high: "bg-destructive/20 text-destructive", medium: "bg-amber-500/20 text-amber-600", low: "bg-muted text-muted-foreground" };

const AdminModerationPage = () => (
  <div className="p-4 lg:p-6 space-y-6">
    <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white">
      <div className="flex items-center gap-3 mb-2"><Shield className="h-7 w-7" /><h1 className="text-2xl font-black font-display">Content Moderation</h1></div>
      <p className="text-white/90 text-sm">Review flagged content, manage reports, and take action</p>
      <div className="flex gap-4 mt-4">
        <div className="rounded-xl bg-white/20 px-4 py-2 text-center"><p className="text-lg font-bold">5</p><p className="text-[10px] text-white/80">Pending</p></div>
        <div className="rounded-xl bg-white/20 px-4 py-2 text-center"><p className="text-lg font-bold">23</p><p className="text-[10px] text-white/80">Resolved This Week</p></div>
        <div className="rounded-xl bg-white/20 px-4 py-2 text-center"><p className="text-lg font-bold">2</p><p className="text-[10px] text-white/80">Warnings Issued</p></div>
      </div>
    </div>

    <div className="space-y-3">
      {reports.map(r => (
        <div key={r.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive shrink-0"><Flag className="h-5 w-5" /></div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-muted-foreground uppercase">{r.type}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${severityColors[r.severity]}`}>{r.severity}</span>
                <span className="text-xs text-muted-foreground ml-auto">{r.date}</span>
              </div>
              <p className="text-sm font-medium text-foreground">{r.content}</p>
              <p className="text-xs text-muted-foreground mt-1">Reported by <span className="font-semibold">{r.reporter}</span> → <span className="font-semibold">{r.reported}</span></p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"><Eye className="h-4 w-4" /></button>
              <button className="rounded-lg p-2 text-secondary hover:bg-secondary/10 transition-colors"><Check className="h-4 w-4" /></button>
              <button className="rounded-lg p-2 text-destructive hover:bg-destructive/10 transition-colors"><AlertTriangle className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default AdminModerationPage;
