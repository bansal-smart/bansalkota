import { CheckCircle2 } from "lucide-react";

export default function OutcomesList({ items }: { items: string[] }) {
  if (!items?.length) return null;
  return (
    <section className="bg-muted/40 py-12 lg:py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-center font-display text-3xl font-black lg:text-4xl">
          What you'll achieve
        </h2>
        <ul className="mx-auto mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
          {items.map((o, i) => (
            <li key={i} className="flex items-start gap-3 rounded-lg bg-card p-4 shadow-sm">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span className="text-sm">{o}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
