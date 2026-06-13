import { useEffect, useState } from "react";
import { Loader2, Copy, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Batch = { id: string; code: string; name: string; course_id: string };

type Props = { testId: string };

const randomToken = () => {
  const a = new Uint8Array(20);
  crypto.getRandomValues(a);
  return Array.from(a).map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 28);
};

const CbtSettingsPanel = ({ testId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<string[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: bs }] = await Promise.all([
      supabase.from("tests").select("cbt_enabled, cbt_token, cbt_allowed_batch_ids").eq("id", testId).maybeSingle(),
      supabase.from("course_batches").select("id, code, name, course_id").order("code"),
    ]);
    if (t) {
      const row = t as { cbt_enabled: boolean; cbt_token: string | null; cbt_allowed_batch_ids: string[] | null };
      setEnabled(row.cbt_enabled);
      setToken(row.cbt_token);
      setAllowed(row.cbt_allowed_batch_ids ?? []);
    }
    setBatches((bs ?? []) as Batch[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [testId]);

  const save = async (patch: { cbt_enabled?: boolean; cbt_token?: string | null; cbt_allowed_batch_ids?: string[] }) => {
    setSaving(true);
    const { error } = await supabase.from("tests").update(patch).eq("id", testId);
    setSaving(false);
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const toggle = async () => {
    if (!enabled) {
      const newTok = token || randomToken();
      const ok = await save({ cbt_enabled: true, cbt_token: newTok });
      if (ok) { setEnabled(true); setToken(newTok); toast.success("CBT enabled"); }
    } else {
      const ok = await save({ cbt_enabled: false });
      if (ok) { setEnabled(false); toast.success("CBT disabled"); }
    }
  };

  const regenerate = async () => {
    const t = randomToken();
    const ok = await save({ cbt_token: t });
    if (ok) { setToken(t); toast.success("New link generated"); }
  };

  const toggleBatch = async (id: string) => {
    const next = allowed.includes(id) ? allowed.filter((x) => x !== id) : [...allowed, id];
    const ok = await save({ cbt_allowed_batch_ids: next });
    if (ok) setAllowed(next);
  };

  const url = token ? `${window.location.origin}/cbt/${token}` : null;

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2"><ShieldCheck className="h-4 w-4 text-primary" /></div>
          <div>
            <p className="text-sm font-bold text-foreground">CBT Mode (secret link)</p>
            <p className="text-[11px] text-muted-foreground">Lets offline / centre students sit this test via a public link using roll number + mobile.</p>
          </div>
        </div>
        <button onClick={toggle} disabled={saving}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${enabled ? "bg-secondary/20 text-secondary" : "bg-primary text-primary-foreground"} disabled:opacity-60`}>
          {enabled ? "CBT enabled" : "Enable CBT"}
        </button>
      </div>

      {enabled && (
        <>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Secret CBT link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate text-xs bg-muted/40 rounded px-2 py-1.5">{url}</code>
              <button onClick={() => { if (url) { navigator.clipboard.writeText(url); toast.success("Link copied"); } }}
                className="rounded-lg border border-border px-2 py-1.5 text-xs hover:bg-muted inline-flex items-center gap-1">
                <Copy className="h-3 w-3" /> Copy
              </button>
              <button onClick={regenerate} disabled={saving}
                className="rounded-lg border border-border px-2 py-1.5 text-xs hover:bg-muted inline-flex items-center gap-1">
                <RefreshCw className="h-3 w-3" /> Regenerate
              </button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">Share with invigilators only. Anyone with this link + a valid roll/mobile can sit the test.</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Allowed batches <span className="text-muted-foreground font-normal">({allowed.length === 0 ? "open to all imported students" : `${allowed.length} selected`})</span></p>
            <div className="flex flex-wrap gap-2">
              {batches.length === 0 && <p className="text-xs text-muted-foreground">No batches yet — create them on the Batches page first.</p>}
              {batches.map((b) => {
                const sel = allowed.includes(b.id);
                return (
                  <button key={b.id} onClick={() => toggleBatch(b.id)} disabled={saving}
                    className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                      sel ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-foreground hover:bg-muted"
                    } disabled:opacity-60`}>
                    {b.code}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CbtSettingsPanel;
