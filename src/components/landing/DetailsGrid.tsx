import type { DetailsBlock } from "@/lib/landingSchemas";
import { GraduationCap, Clock, Monitor, CalendarDays, Languages, CalendarClock } from "lucide-react";

const ROWS: { key: keyof DetailsBlock; label: string; Icon: any }[] = [
  { key: "eligibility", label: "Eligibility", Icon: GraduationCap },
  { key: "duration", label: "Duration", Icon: Clock },
  { key: "mode", label: "Mode", Icon: Monitor },
  { key: "batch_start", label: "Batch Start", Icon: CalendarDays },
  { key: "language", label: "Language", Icon: Languages },
  { key: "schedule", label: "Schedule", Icon: CalendarClock },
];

export default function DetailsGrid({ details }: { details: DetailsBlock }) {
  return (
    <section className="container mx-auto px-4 py-12 lg:py-16">
      <h2 className="text-center font-display text-3xl font-black lg:text-4xl">Course details</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROWS.map(({ key, label, Icon }) => (
          <div key={key} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
            <Icon className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
              <div className="mt-0.5 text-sm font-medium">{details?.[key] || "—"}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
