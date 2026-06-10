import { useEffect, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const CenterSupportPage = () => {
  const { primaryCenterId, primaryCenter } = useCenterAdmin();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!primaryCenterId) return;
    const { data } = await (supabase as any)
      .from("enquiries")
      .select("*")
      .eq("center_id", primaryCenterId)
      .eq("source", "center_support")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, [primaryCenterId]);

  const submit = async () => {
    if (!subject.trim() || !message.trim()) return toast.error("Subject and message are required");
    if (!user || !primaryCenterId) return;
    setSubmitting(true);
    const { error } = await (supabase as any).from("enquiries" as any).insert({
      name: user.email || "Centre Admin",
      email: user.email || "",
      message: `[${subject}]\n${message}`,
      source: "center_support",
      source_type: "center_support" as any,
      center_id: primaryCenterId as any,
      priority: priority as any,
      category: category as any,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Ticket submitted to super admin");
    setSubject(""); setMessage("");
    load();
  };

  if (!primaryCenterId) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black font-display text-foreground">Support from Bansal HQ</h1>
        <p className="text-sm text-muted-foreground">Raise a complaint, request help or ask a question. The super admin team will respond.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-sm font-bold text-foreground">New Ticket — {primaryCenter?.city}</p>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="general">General</option>
            <option value="technical">Technical</option>
            <option value="billing">Billing</option>
            <option value="content">Content / Courses</option>
            <option value="complaint">Complaint</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your request…" rows={5} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
        <button onClick={submit} disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit Ticket
        </button>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-bold text-foreground">Your Past Tickets</p>
        {items.length === 0 ? <p className="text-sm text-muted-foreground">No tickets yet.</p> : items.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{(t.message || "").split("\n")[0].replace(/^\[|\]$/g, "")}</p>
                <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()} · {t.priority || "normal"} · {t.category || "general"}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                t.status === "resolved" ? "bg-secondary/10 text-secondary"
                : t.status === "in_progress" ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
              }`}>{t.status}</span>
            </div>
            <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{(t.message || "").split("\n").slice(1).join("\n")}</p>
            {t.staff_notes && (
              <div className="mt-3 rounded-md bg-muted p-3">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">HQ Reply</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{t.staff_notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CenterSupportPage;
