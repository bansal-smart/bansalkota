import { Link, useLocation } from "react-router-dom";
import BansalButton from "@/components/bansal/BansalButton";

interface Props {
  title: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  external?: boolean;
}

export default function BansalPlaceholderPage({
  title,
  description = "This page is coming soon. We're putting the finishing touches on it.",
  ctaLabel = "Back to Home",
  ctaHref = "/",
  external = false,
}: Props) {
  const location = useLocation();
  return (
    <section className="min-h-[60vh] flex items-center justify-center bg-background">
      <div className="container max-w-2xl text-center py-20 px-4">
        <p className="font-accent uppercase tracking-widest text-primary text-sm mb-3">
          Bansal Classes
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
          {title}
        </h1>
        <p className="text-muted-foreground text-lg mb-8">{description}</p>
        {external ? (
          <a href={ctaHref} target="_blank" rel="noopener noreferrer">
            <BansalButton variant="primary">{ctaLabel}</BansalButton>
          </a>
        ) : (
          <Link to={ctaHref}>
            <BansalButton variant="primary">{ctaLabel}</BansalButton>
          </Link>
        )}
        <p className="text-xs text-muted-foreground mt-6">Route: {location.pathname}</p>
      </div>
    </section>
  );
}
