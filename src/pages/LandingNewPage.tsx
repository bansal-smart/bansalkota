import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Flame, Phone } from "lucide-react";
import { useLandingConfig } from "@/hooks/useLandingConfig";
import HeroSection from "@/components/landing/HeroSection";
import HighlightsGrid from "@/components/landing/HighlightsGrid";
import OutcomesList from "@/components/landing/OutcomesList";
import DetailsGrid from "@/components/landing/DetailsGrid";
import FAQAccordion from "@/components/landing/FAQAccordion";
import ContactBlock from "@/components/landing/ContactBlock";
import StickyMobileCTA from "@/components/landing/StickyMobileCTA";
import LeadForm from "@/components/landing/LeadForm";

export default function LandingNewPage() {
  const { data: config, isLoading } = useLandingConfig();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!config || !config.is_published) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div>
          <Flame className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 text-2xl font-black">Coming soon</h1>
          <p className="mt-2 text-muted-foreground">This campaign page is not live yet.</p>
        </div>
      </div>
    );
  }

  const title = `${config.hero?.title || "Bansal Campaign"} | Bansal Classes`;
  const desc = config.hero?.subtitle || "Enrol in the latest Bansal Classes program.";

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <Helmet>
        <title>{title.slice(0, 60)}</title>
        <meta name="description" content={desc.slice(0, 160)} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        {config.hero?.banner_url && <meta property="og:image" content={config.hero.banner_url} />}
        <link rel="canonical" href={`${window.location.origin}/new`} />
      </Helmet>

      {/* Minimal top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Flame className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-black font-display">Bansal Classes</span>
          </Link>
          {config.contact?.phone && (
            <a href={`tel:${config.contact.phone}`} className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-sm font-bold text-primary">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">{config.contact.phone}</span>
              <span className="sm:hidden">Call</span>
            </a>
          )}
        </div>
      </header>

      <HeroSection hero={config.hero || {}} formConfig={config.form_config || {}} />

      {config.overview && (
        <section className="container mx-auto max-w-3xl px-4 py-12 lg:py-16">
          <h2 className="text-center font-display text-3xl font-black lg:text-4xl">Program overview</h2>
          <p className="mt-6 whitespace-pre-line text-center text-base text-muted-foreground lg:text-lg">
            {config.overview}
          </p>
        </section>
      )}

      <HighlightsGrid items={config.highlights || []} />
      <OutcomesList items={config.outcomes || []} />
      <DetailsGrid details={config.details || {}} />
      <FAQAccordion items={config.faqs || []} />
      <ContactBlock contact={config.contact || {}} />

      {/* Footer CTA strip */}
      <section className="bg-foreground py-12 text-background">
        <div className="container mx-auto grid max-w-4xl gap-6 px-4 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-2xl font-black lg:text-3xl">
              Ready to take the next step?
            </h2>
            <p className="mt-2 text-sm opacity-80">
              Limited seats. Don't miss this batch — register now.
            </p>
          </div>
          <LeadForm config={config.form_config || {}} compact />
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Bansal Classes ·{" "}
        <Link to="/privacy" className="hover:underline">Privacy</Link> ·{" "}
        <Link to="/terms" className="hover:underline">Terms</Link>
      </footer>

      <StickyMobileCTA label={config.hero?.cta_label || "Register Now"} />
    </div>
  );
}
