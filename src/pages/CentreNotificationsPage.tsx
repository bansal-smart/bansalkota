import { Bell, AlertTriangle, Info, Flame } from "lucide-react";
import { useCentreNotifications, type CentreNotification } from "@/hooks/useCentreNotifications";

// Centre admin's read-only view of the super admin's broadcast feed.
// One-way by design: no reply/compose UI here, matching the RLS policy
// (centre_staff only has SELECT on centre_notifications).

const priorityBadge = (p: CentreNotification["priority"]) => {
  if (p === "urgent") return "bg-destructive/10 text-destructive";
  if (p === "important") return "bg-bansal-orange/10 text-bansal-orange";
  return "bg-muted text-muted-foreground";
};

const priorityIcon = (p: CentreNotification["priority"]) => {
  if (p === "urgent") return <Flame className="h-3 w-3" />;
  if (p === "important") return <AlertTriangle className="h-3 w-3" />;
  return <Info className="h-3 w-3" />;
};

const CentreNotificationsPage = () => {
  const { notifications, loading } = useCentreNotifications();

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
      <div>
        <h1 className="text-2xl font-black font-display text-foreground flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" /> Notifications
        </h1>
        <p className="text-sm text-muted-foreground">Updates and announcements from Bansal Classes HQ.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 max-w-2xl">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && !notifications.length && (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        )}
        <div className="space-y-3">
          {notifications.map((n) => (
            <article key={n.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityBadge(n.priority)}`}>
                  {priorityIcon(n.priority)} {n.priority}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              <h3 className="text-sm font-bold text-foreground">{n.title}</h3>
              <p className="text-xs text-muted-foreground whitespace-pre-line mt-1">{n.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CentreNotificationsPage;
