import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send, RefreshCw, MessageSquare, Wallet } from "lucide-react";

type Template = { name: string; body: string; vars: string[]; description: string };
type Broadcast = {
  id: string; title: string; template_name: string; status: string;
  total_recipients: number; sent_count: number; failed_count: number;
  scheduled_at?: string | null; created_at: string;
};

const AdminSmsBroadcastsPage = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [vars, setVars] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState<{ role?: string; course_id?: string; centre_id?: string; batch_id?: string }>({});
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<{ balance?: number; error?: string; fetched_at?: string } | null>(null);

  const tpl = templates.find((t) => t.name === selected);
  const preview = tpl ? renderPreview(tpl, vars) : "";

  const loadTemplates = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("prpsms-templates", { method: "GET" });
    if (error) toast.error(error.message);
    else setTemplates((data as { templates: Template[] }).templates);
  }, []);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase.from("sms_broadcasts").select("*").order("created_at", { ascending: false }).limit(50);
    setHistory((data as Broadcast[]) || []);
  }, []);

  const loadBalance = useCallback(async (force = false) => {
    const { data, error } = await supabase.functions.invoke(`prpsms-balance${force ? "?force=1" : ""}`, { method: "GET" });
    if (error) setBalance({ error: error.message });
    else setBalance(data as { balance?: number; fetched_at?: string });
  }, []);

  useEffect(() => { loadTemplates(); loadHistory(); loadBalance(); }, [loadTemplates, loadHistory, loadBalance]);

  const submit = async (sendNow: boolean) => {
    if (!title.trim() || !tpl) return toast.error("Title and template required");
    for (const k of tpl.vars) {
      if (!vars[k]) return toast.error(`Variable "${k}" required`);
    }
    setLoading(true);
    try {
      const { data: bc, error } = await supabase.from("sms_broadcasts").insert({
        title: title.trim(),
        template_name: tpl.name,
        vars_defaults: vars,
        audience_filter: audience,
        status: sendNow ? "queued" : "draft",
      }).select().single();
      if (error) throw error;
      if (sendNow) {
        const { error: invErr } = await supabase.functions.invoke("prpsms-broadcast", {
          body: { broadcast_id: bc.id }, method: "POST",
        });
        if (invErr) throw invErr;
        toast.success("Broadcast started");
      } else {
        toast.success("Saved as draft");
      }
      setTitle(""); setVars({}); setSelected(""); loadHistory();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setLoading(false); }
  };

  const runDraft = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("prpsms-broadcast", { body: { broadcast_id: id }, method: "POST" });
      if (error) throw error;
      toast.success("Broadcast started");
      loadHistory();
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" /> SMS Broadcasts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Send DLT-approved SMS via PRPSMS (sender 20190332).</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 min-w-[220px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> PRPSMS Balance
            </span>
            <button onClick={() => loadBalance(true)} className="text-muted-foreground hover:text-foreground">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
          {balance?.error ? (
            <p className="mt-2 text-sm text-destructive">{balance.error}</p>
          ) : balance?.balance !== undefined ? (
            <>
              <p className={`mt-1 font-display text-3xl font-extrabold ${balance.balance < 500 ? "text-destructive" : "text-foreground"}`}>
                {balance.balance.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">credits remaining</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-bold text-lg">Compose Broadcast</h2>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Title (internal)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="e.g. Boost result reminder — Jan batch" />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Template (approved only)</label>
            <select value={selected} onChange={(e) => { setSelected(e.target.value); setVars({}); }} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="">— Select template —</option>
              {templates.map((t) => <option key={t.name} value={t.name}>{t.name} — {t.description}</option>)}
            </select>
          </div>

          {tpl && (
            <>
              <div className="rounded-md bg-muted/50 border border-border p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Preview</p>
                <p className="text-xs text-foreground whitespace-pre-wrap font-mono">{preview}</p>
                <p className="text-[10px] text-muted-foreground mt-2">{preview.length} chars</p>
              </div>

              <div className="space-y-2">
                {tpl.vars.map((v) => (
                  <div key={v}>
                    <label className="text-xs font-semibold text-muted-foreground">{v}</label>
                    <input
                      value={vars[v] || ""}
                      onChange={(e) => setVars({ ...vars, [v]: e.target.value })}
                      className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                      placeholder={`Value for {${v}}`}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Audience filter (optional)</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input value={audience.role || ""} onChange={(e) => setAudience({ ...audience, role: e.target.value || undefined })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="role (student/teacher/...)" />
              <input value={audience.course_id || ""} onChange={(e) => setAudience({ ...audience, course_id: e.target.value || undefined })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="course_id (uuid)" />
              <input value={audience.centre_id || ""} onChange={(e) => setAudience({ ...audience, centre_id: e.target.value || undefined })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="centre_id (uuid)" />
              <input value={audience.batch_id || ""} onChange={(e) => setAudience({ ...audience, batch_id: e.target.value || undefined })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="batch_id (uuid)" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Leave blank for all profiles. Recipients without a phone number are skipped.</p>
          </div>

          <div className="flex gap-2">
            <button onClick={() => submit(false)} disabled={loading} className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-muted">Save Draft</button>
            <button onClick={() => submit(true)} disabled={loading} className="flex-1 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-1.5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Now
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">History</h2>
            <button onClick={loadHistory} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Refresh</button>
          </div>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {history.length === 0 && <p className="text-sm text-muted-foreground">No broadcasts yet.</p>}
            {history.map((b) => (
              <div key={b.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{b.title}</p>
                    <p className="text-[11px] text-muted-foreground">{b.template_name} • {new Date(b.created_at).toLocaleString()}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    b.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                    b.status === "running" ? "bg-blue-100 text-blue-700" :
                    b.status === "failed" ? "bg-red-100 text-red-700" :
                    "bg-muted text-muted-foreground"
                  }`}>{b.status}</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1 text-[11px]">
                  <div><span className="text-muted-foreground">Total:</span> <span className="font-semibold">{b.total_recipients}</span></div>
                  <div><span className="text-muted-foreground">Sent:</span> <span className="font-semibold text-emerald-700">{b.sent_count}</span></div>
                  <div><span className="text-muted-foreground">Failed:</span> <span className="font-semibold text-red-700">{b.failed_count}</span></div>
                </div>
                {b.status === "draft" && (
                  <button onClick={() => runDraft(b.id)} className="mt-2 text-xs font-semibold text-primary hover:underline">Start sending →</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function renderPreview(tpl: Template, vars: Record<string, string>): string {
  let out = tpl.body;
  for (const k of tpl.vars) {
    out = out.replace("{#var#}", vars[k] || `{${k}}`);
  }
  return out;
}

export default AdminSmsBroadcastsPage;
