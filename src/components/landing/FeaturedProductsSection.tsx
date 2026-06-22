import { ArrowRight, Loader2, GraduationCap, BookOpen, FileText } from "lucide-react";
import type { FeaturedConfig } from "@/lib/landingSchemas";
import { useFeaturedProducts } from "@/hooks/useFeaturedProducts";

const KIND_LABEL: Record<string, string> = {
  test_series: "Test Series",
  course: "Course",
  book: "Study Material",
};

export default function FeaturedProductsSection({ data }: { data: FeaturedConfig }) {
  if (!data || data.enabled === false || !data.items?.length) return null;
  const { data: products, isLoading } = useFeaturedProducts(data.items);

  return (
    <section className="bg-muted/30 py-16 lg:py-20">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-10 text-center">
          {data.title && (
            <h2 className="font-display text-3xl font-black text-foreground lg:text-4xl">{data.title}</h2>
          )}
          {data.subtitle && <p className="mt-3 text-base text-muted-foreground">{data.subtitle}</p>}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(products || []).map((p) => (
              <a
                key={`${p.kind}-${p.ref_id}`}
                href={p.link}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No image</div>
                  )}
                  {p.badge && (
                    <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground">
                      {p.badge}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{KIND_LABEL[p.kind]}</span>
                  <h3 className="mt-1 font-display text-lg font-black leading-snug text-foreground">{p.title}</h3>
                  {p.subtitle && <p className="mt-1 text-sm text-muted-foreground">{p.subtitle}</p>}
                  <div className="mt-4 flex items-center justify-between">
                    {p.price != null && (
                      <span className="text-base font-black text-foreground">₹{p.price.toLocaleString("en-IN")}</span>
                    )}
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-primary">
                      Explore <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
