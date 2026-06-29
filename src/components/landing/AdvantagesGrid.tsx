import { Link } from "react-router-dom";
import { useLandingAdvantages } from "@/hooks/useLandingAdvantages";

type Fallback = { image_url: string; link_url: string; alt_text?: string };

export default function AdvantagesGrid({ fallback }: { fallback: Fallback[] }) {
  const { items, loading } = useLandingAdvantages({ activeOnly: true });
  const tiles = items.length > 0 ? items.map((i) => ({
    image_url: i.image_url,
    link_url: i.link_url || "/",
    alt_text: i.alt_text || i.title || "Advantage",
  })) : fallback;

  if (loading && items.length === 0 && fallback.length === 0) return null;

  return (
    <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
      {tiles.map((t, i) => {
        const hashIdx = t.link_url.indexOf("#");
        const isExternal = /^https?:\/\//i.test(t.link_url);
        const pathPart = hashIdx >= 0 ? t.link_url.slice(0, hashIdx) : t.link_url;
        const hashPart = hashIdx >= 0 ? t.link_url.slice(hashIdx) : "";
        const samePathHash = hashPart && (pathPart === "" || pathPart === window.location.pathname || (pathPart === "/" && window.location.pathname === "/"));
        const onClick = samePathHash
          ? (e: React.MouseEvent) => {
              e.preventDefault();
              const el = document.querySelector(hashPart);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              } else {
                window.location.hash = hashPart;
              }
            }
          : undefined;

        const inner = (
          <img
            src={t.image_url}
            alt={t.alt_text || ""}
            className="w-full aspect-square object-cover"
            loading="lazy"
          />
        );
        const className = "block rounded-3xl overflow-hidden shadow-lg hover-lift bg-white";
        if (hashPart && !isExternal) {
          return (
            <a key={i} href={t.link_url} onClick={onClick} className={className}>{inner}</a>
          );
        }
        if (isExternal) {
          return (
            <a key={i} href={t.link_url} target="_blank" rel="noopener noreferrer" className={className}>{inner}</a>
          );
        }
        return (
          <Link key={i} to={t.link_url} className={className}>{inner}</Link>
        );
      })}
    </div>
  );
}
