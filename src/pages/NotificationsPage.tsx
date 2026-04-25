import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/context/AuthContext";
import { markAllNotificationsRead, markNotificationRead } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

const NotificationsPage = () => {
  const { user } = useAuth();
  const { notifications, unreadCount } = useAppStore();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const navigate = useNavigate();

  const visible = filter === "unread" ? notifications.filter((n) => !n.read_at) : notifications;

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto pb-20 lg:pb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-black font-display text-foreground lg:text-2xl">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && user && (
          <button
            onClick={() => markAllNotificationsRead(user.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-background transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-pill px-4 py-1.5 text-xs font-bold capitalize transition-colors ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {visible.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notifications</p>
          </div>
        ) : (
          visible.map((n) => {
            const unread = !n.read_at;
            return (
              <button
                key={n.id}
                onClick={async () => {
                  await markNotificationRead(n.id);
                  if (n.link) navigate(n.link);
                }}
                className={`block w-full text-left border-b border-border last:border-0 px-5 py-4 hover:bg-background/50 transition-colors ${
                  unread ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
