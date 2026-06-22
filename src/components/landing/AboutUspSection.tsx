import * as Icons from "lucide-react";
import type { AboutConfig } from "@/lib/landingSchemas";

function Icon({ name }: { name: string }) {
  const C = (Icons as any)[name] || Icons.Sparkles;
  return <C className="h-5 w-5" />;
}

export default function AboutUspSection({ data }: { data: AboutConfig }) {
  if (!data || data.enabled === false) return null;
  const usps = data.usps || [];
  if (!data.title && !data.body && usps.length === 0) return null;

  return (
    <section className="bg-background py-16 lg:py-20">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1.4fr] lg:gap-16">
          <div>
            {data.eyebrow && (
              <p className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
                {data.eyebrow}
              </p>
            )}
            <h2 className="font-display text-3xl font-black leading-tight text-foreground lg:text-4xl">
              {data.title}
            </h2>
            {data.body && (
              <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-muted-foreground">{data.body}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {usps.map((u, i) => (
              <div
                key={i}
                className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon name={u.icon} />
                </div>
                <h3 className="mt-4 font-display text-base font-black text-foreground">{u.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{u.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
