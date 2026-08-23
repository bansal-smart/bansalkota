import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const BOOST_SETTINGS_ID = "a0000000-0000-0000-0000-0000000b0057";

export type BoostSettings = {
  id: string;
  exam_dates: string[]; // YYYY-MM-DD
  price_inr: number;
  apply_deadline_time: string; // HH:MM:SS
  apply_deadline_days_before: number;
};

const DEFAULTS: BoostSettings = {
  id: BOOST_SETTINGS_ID,
  exam_dates: [],
  price_inr: 99,
  apply_deadline_time: "18:00:00",
  apply_deadline_days_before: 2,
};

// Parse "YYYY-MM-DD" as a local-noon Date to avoid TZ off-by-one
function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

function startOfTodayLocal(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDate(d: Date): string {
  return dateFmt.format(d);
}

function formatTime(time: string): string {
  // time is HH:MM[:SS]
  const [hStr, mStr] = time.split(":");
  let h = Number(hStr);
  const m = Number(mStr);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function useBoostSettings() {
  const [settings, setSettings] = useState<BoostSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("boost_settings" as any)
        .select("*")
        .eq("id", BOOST_SETTINGS_ID)
        .maybeSingle();
      if (cancelled) return;
      if (data) setSettings(data as unknown as BoostSettings);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const examDates: Date[] = (settings.exam_dates || [])
    .map(parseISODate)
    .sort((a, b) => a.getTime() - b.getTime());

  // Registration for a given exam date closes `apply_deadline_days_before` days
  // before it, at `apply_deadline_time`.
  function deadlineFor(examDate: Date): Date {
    const [hStr, mStr] = settings.apply_deadline_time.split(":");
    const deadline = new Date(examDate);
    deadline.setDate(deadline.getDate() - settings.apply_deadline_days_before);
    deadline.setHours(Number(hStr), Number(mStr), 0, 0);
    return deadline;
  }

  const today = startOfTodayLocal();
  const nextExamDate = examDates.find((d) => d.getTime() >= today.getTime()) ?? null;

  const now = Date.now();
  // The soonest exam date whose registration window is still open — this is
  // what registration is actually being taken for, and can differ from
  // `nextExamDate` once that date's own cutoff has passed.
  const openExamDate = examDates.find((d) => deadlineFor(d).getTime() >= now) ?? null;
  // No dates announced yet: nothing to enforce, so registration stays open.
  const registrationOpen = examDates.length === 0 || !!openExamDate;
  const applyBefore = openExamDate ? deadlineFor(openExamDate) : null;

  return {
    loading,
    settings,
    priceInr: settings.price_inr,
    examDates,
    examDateLabels: examDates.map(formatDate),
    nextExamDate,
    nextExamDateLabel: nextExamDate ? formatDate(nextExamDate) : null,
    registrationOpen,
    applyBefore,
    applyBeforeLabel: applyBefore
      ? `Apply before ${formatDate(applyBefore)}, ${formatTime(settings.apply_deadline_time)}`
      : null,
  };
}
