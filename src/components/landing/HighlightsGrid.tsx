import type { Highlight } from "@/lib/landingSchemas";
import * as Icons from "lucide-react";

export default function HighlightsGrid({ items }: { items: Highlight[] }) {
  if (!items?.length) return null;
  return (
    <section className="container mx-auto px-4 py-12 lg:py-16">
      <h2 className="text-center font-display text-3xl font-black lg:text-4xl">Why this program</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((h, i) => {
          const Icon = (Icons as any)[h.icon] || Icons.Sparkles;
          return (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold">{h.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{h.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
