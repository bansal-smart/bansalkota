import type { TopBannerConfig } from "@/lib/landingSchemas";

export default function TopBannerSection({ data }: { data: TopBannerConfig }) {
  if (!data || data.enabled === false || !data.image_url) return null;

  const hasOverlay = data.headline || data.subheading || data.cta_label;

  const inner = (
    <div className="relative w-full overflow-hidden">
      <img
        src={data.image_url}
        alt={data.alt || data.headline || "Promotional banner"}
        className="w-full object-cover h-[180px] sm:h-[260px] md:h-[340px] lg:h-[420px] max-h-[60vh]"
        loading="eager"
      />

      {hasOverlay && (
        <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/55 via-black/25 to-transparent">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl text-white">
              {data.headline && (
                <h2 className="font-display text-2xl font-black leading-tight md:text-4xl lg:text-5xl">
                  {data.headline}
                </h2>
              )}
              {data.subheading && (
                <p className="mt-3 text-sm text-white/85 md:text-base lg:text-lg">{data.subheading}</p>
              )}
              {data.cta_label && data.cta_link && (
                <a
                  href={data.cta_link}
                  className="mt-5 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground shadow-lg transition hover:scale-[1.02]"
                >
                  {data.cta_label}
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (data.link) {
    return (
      <a href={data.link} target={data.link.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="block">
        {inner}
      </a>
    );
  }
  return <section>{inner}</section>;
}
