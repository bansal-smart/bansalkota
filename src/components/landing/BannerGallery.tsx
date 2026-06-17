import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import type { BannerItem } from "@/lib/landingSchemas";

interface Props {
  items: BannerItem[];
}

function BannerCard({ b }: { b: BannerItem }) {
  const inner = (
    <div className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-lg">
      <div className="aspect-video w-full overflow-hidden">
        <img
          src={b.image_url}
          alt={b.alt || b.caption || "Bansal Classes promotional banner"}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      {b.caption && (
        <div className="px-4 py-3 text-sm font-semibold text-foreground">{b.caption}</div>
      )}
    </div>
  );
  return b.link ? (
    <a href={b.link} target={b.link.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="block">
      {inner}
    </a>
  ) : (
    inner
  );
}

export default function BannerGallery({ items }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <section className="container mx-auto px-4 py-10 lg:py-14">
      <h2 className="mb-6 text-center font-display text-2xl font-black lg:text-3xl">Featured programs</h2>

      {/* Desktop: grid */}
      <div className="hidden gap-6 md:grid md:grid-cols-2">
        {items.map((b, i) => (
          <BannerCard key={i} b={b} />
        ))}
      </div>

      {/* Mobile: carousel */}
      <div className="md:hidden">
        <Carousel opts={{ loop: true }}>
          <CarouselContent>
            {items.map((b, i) => (
              <CarouselItem key={i}>
                <BannerCard b={b} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>
      </div>
    </section>
  );
}
