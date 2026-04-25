import { Settings, Globe, Palette, Shield, Bell, Database } from "lucide-react";
import { useState } from "react";

const AdminSettingsPage = () => {
  const [siteName, setSiteName] = useState("Arke");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrations, setRegistrations] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);

  const Toggle = ({ on, toggle }: { on: boolean; toggle: () => void }) => (
    <button onClick={toggle} className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}>
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-2xl">
      <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white">
        <div className="flex items-center gap-3"><Settings className="h-7 w-7" /><h1 className="text-2xl font-black font-display">Platform Settings</h1></div>
        <p className="text-white/90 text-sm mt-1">Configure global platform settings and features</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4"><Globe className="h-4 w-4 text-primary" /> General</h3>
          <div className="space-y-3">
            <div><label className="text-xs font-medium text-muted-foreground">Site Name</label><input value={siteName} onChange={e => setSiteName(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary" /></div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-foreground">Maintenance Mode</p><p className="text-xs text-muted-foreground">Temporarily disable access</p></div>
              <Toggle on={maintenanceMode} toggle={() => setMaintenanceMode(!maintenanceMode)} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-foreground">Open Registrations</p><p className="text-xs text-muted-foreground">Allow new student signups</p></div>
              <Toggle on={registrations} toggle={() => setRegistrations(!registrations)} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4"><Bell className="h-4 w-4 text-primary" /> Notifications</h3>
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-foreground">Email Alerts</p><p className="text-xs text-muted-foreground">Admin email notifications for critical events</p></div>
            <Toggle on={emailNotif} toggle={() => setEmailNotif(!emailNotif)} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4"><Database className="h-4 w-4 text-primary" /> Data</h3>
          <div className="flex gap-3">
            <button className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity">Export All Data</button>
            <button className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors">Clear Cache</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettingsPage;
