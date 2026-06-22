import type { CtaConfig } from "@/lib/landingSchemas";

export default function FinalCtaSection({ data }: { data: CtaConfig }) {
  if (!data || data.enabled === false || (!data.headline && !data.button_label)) return null;

  const bg = data.background_image_url
    ? `linear-gradient(rgba(15,23,42,0.85), rgba(15,23,42,0.9)), url(${data.background_image_url}) center/cover no-repeat`
    : "linear-gradient(135deg, hsl(222,47%,11%) 0%, hsl(222,47%,18%) 100%)";

  return (
    <section className="py-16 lg:py-20" style={{ background: bg }}>
      <div className="container mx-auto max-w-4xl px-4 text-center text-white">
        {data.headline && (
          <h2 className="font-display text-3xl font-black leading-tight lg:text-4xl">{data.headline}</h2>
        )}
        {data.subheading && <p className="mt-4 text-base text-white/80 lg:text-lg">{data.subheading}</p>}
        {data.button_label && data.button_link && (
          <a
            href={data.button_link}
            className="mt-8 inline-flex h-12 items-center rounded-md bg-primary px-8 text-base font-bold text-primary-foreground shadow-lg transition hover:scale-[1.02]"
          >
            {data.button_label}
          </a>
        )}
      </div>
    </section>
  );
}
