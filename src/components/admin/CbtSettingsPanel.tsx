import { useEffect, useState } from "react";
import { Loader2, Copy, ShieldCheck, Monitor, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Batch = { id: string; code: string; name: string };

type Props = { testId: string };

const CbtSettingsPanel = ({ testId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"digital" | "cbt">("digital");
  const [allowed, setAllowed] = useState<string[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: bs }] = await Promise.all([
      supabase.from("tests").select("test_mode, cbt_allowed_batch_ids").eq("id", testId).maybeSingle(),
      supabase.from("course_batches").select("id, code, name").order("code"),
    ]);
    const row = t as { test_mode: string | null; cbt_allowed_batch_ids: string[] | null } | null;
    setMode(row?.test_mode === "cbt" ? "cbt" : "digital");
    setAllowed(row?.cbt_allowed_batch_ids ?? []);
    setBatches((bs ?? []) as Batch[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [testId]);

  const save = async (patch: { test_mode?: string; cbt_enabled?: boolean; cbt_allowed_batch_ids?: string[] }) => {
    setSaving(true);
    const { error } = await supabase.from("tests").update(patch).eq("id", testId);
    setSaving(false);
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const setModeAndSave = async (next: "digital" | "cbt") => {
    const ok = await save({ test_mode: next, cbt_enabled: next === "cbt" });
    if (ok) { setMode(next); toast.success(`Test mode: ${next === "cbt" ? "CBT (Kiosk)" : "Digital"}`); }
  };

  const toggleBatch = async (id: string) => {
    const next = allowed.includes(id) ? allowed.filter((x) => x !== id) : [...allowed, id];
    const ok = await save({ cbt_allowed_batch_ids: next });
    if (ok) setAllowed(next);
  };

  const kioskUrl = typeof window !== "undefined" ? `${window.location.origin}/cbt` : "/cbt";

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2"><ShieldCheck className="h-4 w-4 text-primary" /></div>
          <div>
            <p className="text-sm font-bold text-foreground">Test Mode</p>
            <p className="text-[11px] text-muted-foreground">Choose how students take this test.</p>
          </div>
        </div>
        <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs font-bold">
          <button onClick={() => setModeAndSave("digital")} disabled={saving} className={`px-3 py-1.5 ${mode === "digital" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}>Digital</button>
          <button onClick={() => setModeAndSave("cbt")} disabled={saving} className={`px-3 py-1.5 ${mode === "cbt" ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-muted"}`}>CBT (Kiosk)</button>
        </div>
      </div>

      {mode === "cbt" && (
        <>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 inline-flex items-center gap-1"><Monitor className="h-3 w-3" /> Kiosk URL (single fixed link)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate text-xs bg-muted/40 rounded px-2 py-1.5">{kioskUrl}</code>
              <button onClick={() => { navigator.clipboard.writeText(kioskUrl); toast.success("Link copied"); }}
                className="rounded-lg border border-border px-2 py-1.5 text-xs hover:bg-muted inline-flex items-center gap-1">
                <Copy className="h-3 w-3" /> Copy
              </button>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">Open this on lab computers (kiosk mode). Students sign in with Roll No + Mobile and will see this test if it's live and their batch is allowed.</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Allowed batches <span className="text-muted-foreground font-normal">({allowed.length === 0 ? "open to all batches" : `${allowed.length} selected`})</span></p>
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
