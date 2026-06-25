import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Settings as SettingsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BOOST_SETTINGS_ID } from "@/hooks/useBoostSettings";

type Row = {
  id: string;
  exam_dates: string[];
  price_inr: number;
  apply_deadline_time: string;
  apply_deadline_days_before: number;
};

export default function BoostSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dates, setDates] = useState<string[]>([]);
  const [price, setPrice] = useState(99);
  const [time, setTime] = useState("18:00");
  const [daysBefore, setDaysBefore] = useState(1);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("boost_settings" as any)
        .select("*")
        .eq("id", BOOST_SETTINGS_ID)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        const r = data as unknown as Row;
        setDates(r.exam_dates ?? []);
        setPrice(r.price_inr ?? 99);
        setTime((r.apply_deadline_time ?? "18:00:00").slice(0, 5));
        setDaysBefore(r.apply_deadline_days_before ?? 1);
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const clean = Array.from(new Set(dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))).sort();
    const { error } = await supabase
      .from("boost_settings" as any)
      .update({
        exam_dates: clean,
        price_inr: price,
        apply_deadline_time: time.length === 5 ? `${time}:00` : time,
        apply_deadline_days_before: daysBefore,
      })
      .eq("id", BOOST_SETTINGS_ID);
    setSaving(false);
    if (error) return toast.error(error.message);
    setDates(clean);
    toast.success("BOOST settings saved");
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading BOOST settings…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <SettingsIcon className="h-5 w-5 text-bansal-orange" />
        <h2 className="font-bold text-foreground">BOOST Settings</h2>
        <span className="text-xs text-muted-foreground">Drives landing CTA, /boost page, and registration price.</span>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-5">
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Registration price (₹)</label>
          <input
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value) || 0)}
            className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Apply-before cutoff time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Days before exam</label>
          <input
            type="number"
            min={0}
            max={30}
            value={daysBefore}
            onChange={(e) => setDaysBefore(Number(e.target.value) || 0)}
            className="w-full mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-muted-foreground">Exam dates</label>
          <button
            type="button"
            onClick={() => setDates((ds) => [...ds, ""])}
            className="inline-flex items-center gap-1 text-xs font-semibold text-bansal-orange hover:underline"
          >
            <Plus className="h-3 w-3" /> Add date
          </button>
        </div>
        <div className="space-y-2">
          {dates.length === 0 && (
            <div className="text-xs text-muted-foreground italic">No exam dates yet. Add at least one.</div>
          )}
          {dates.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="date"
                value={d}
                onChange={(e) => setDates((ds) => ds.map((x, j) => (j === i ? e.target.value : x)))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => setDates((ds) => ds.filter((_, j) => j !== i))}
                className="p-2 text-muted-foreground hover:text-red-600"
                aria-label="Remove date"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-bansal-orange text-white px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save settings
        </button>
      </div>
    </div>
  );
}
