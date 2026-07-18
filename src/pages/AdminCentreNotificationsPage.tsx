import { useState } from "react";
import { Megaphone, Send, Trash2, Loader2, AlertTriangle, Info, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCentreNotifications, type CentreNotification } from "@/hooks/useCentreNotifications";

// Super admin -> all centre admins, one-way broadcast. Every centre_staff
// member sees every row here (RLS: is_any_centre_staff), read-only on their
// side — there is no reply/recipient-scoping, just a shared feed.

const PRIORITIES: { value: CentreNotification["priority"]; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "important", label: "Important" },
  { value: "urgent", label: "Urgent" },
];

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

const AdminCentreNotificationsPage = () => {
  const { notifications, loading, reload } = useCentreNotifications();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<CentreNotification["priority"]>("normal");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      return toast.error("Title and message are required");
    }
    setSending(true);
    const { error } = await (supabase as any)
      .from("centre_notifications")
      .insert({ title: title.trim(), body: body.trim(), priority });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success("Notification sent to all centres");
    setTitle("");
    setBody("");
    setPriority("normal");
    reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this notification? Centre admins will no longer see it.")) return;
    const { error } = await (supabase as any).from("centre_notifications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    reload();
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
      <div>
        <h1 className="text-2xl font-black font-display text-foreground flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" /> Centre Notifications
        </h1>
        <p className="text-sm text-muted-foreground">
          Send updates and announcements to every centre admin. This is one-way — centre admins can only view these,
          not reply.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 max-w-2xl space-y-4">
        <h2 className="text-sm font-bold text-foreground">Compose notification</h2>

        <div>
          <label className="text-xs font-semibold text-foreground">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 100))}
            placeholder="e.g. Fee structure updated for 2026-27 session"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 1000))}
            rows={4}
            placeholder="Write the update for all centre admins…"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none focus:border-primary"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground">Priority</label>
          <div className="mt-2 flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  priority === p.value ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send to all centres
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 max-w-2xl">
        <h2 className="text-sm font-bold text-foreground mb-3">Sent notifications</h2>
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && !notifications.length && (
          <p className="text-sm text-muted-foreground">No notifications sent yet.</p>
        )}
        <div className="space-y-3">
          {notifications.map((n) => (
            <article key={n.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
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
                </div>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="shrink-0 rounded-md border border-destructive/40 text-destructive px-2 py-1 text-[11px]"
                  aria-label="Delete notification"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminCentreNotificationsPage;
