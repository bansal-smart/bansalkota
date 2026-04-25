import { Settings, User, CreditCard, Bell, Shield } from "lucide-react";
import { useState } from "react";

const TeacherSettingsPage = () => {
  const [name, setName] = useState("Vikram Thapar");
  const [email, setEmail] = useState("vikram@arke.pro");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [classNotif, setClassNotif] = useState(true);
  const [doubtNotif, setDoubtNotif] = useState(true);

  const Toggle = ({ on, toggle }: { on: boolean; toggle: () => void }) => (
    <button onClick={toggle} className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}>
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-2xl">
      <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white">
        <div className="flex items-center gap-3"><Settings className="h-7 w-7" /><h1 className="text-2xl font-black font-display">Settings</h1></div>
        <p className="text-white/90 text-sm mt-1">Manage your teacher profile and preferences</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4"><User className="h-4 w-4 text-primary" /> Profile</h3>
          <div className="space-y-3">
            <div><label className="text-xs font-medium text-muted-foreground">Full Name</label><input value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Email</label><input value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" /></div>
            <div><label className="text-xs font-medium text-muted-foreground">Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" /></div>
            <button className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity">Save Changes</button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4"><CreditCard className="h-4 w-4 text-primary" /> Payout Settings</h3>
          <p className="text-xs text-muted-foreground mb-2">Your earnings are transferred monthly to your registered bank account.</p>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Bank: HDFC Bank ****4521</p>
            <p className="text-xs text-muted-foreground mt-1">Next payout: April 1, 2026</p>
          </div>
          <button className="mt-3 rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors">Update Bank Details</button>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4"><Bell className="h-4 w-4 text-primary" /> Notifications</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><div><p className="text-sm text-foreground">Class Reminders</p><p className="text-xs text-muted-foreground">30 min before class starts</p></div><Toggle on={classNotif} toggle={() => setClassNotif(!classNotif)} /></div>
            <div className="flex items-center justify-between"><div><p className="text-sm text-foreground">New Doubts</p><p className="text-xs text-muted-foreground">Get notified for student doubts</p></div><Toggle on={doubtNotif} toggle={() => setDoubtNotif(!doubtNotif)} /></div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4"><Shield className="h-4 w-4 text-primary" /> Security</h3>
          <button className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity">Change Password</button>
        </div>
      </div>
    </div>
  );
};

export default TeacherSettingsPage;
