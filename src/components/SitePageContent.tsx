import BansalBadge from "@/components/bansal/BansalBadge";
import { useSitePage } from "@/hooks/useSitePage";

type Props = {
  slug: string;
  fallbackTitle: string;
  badge?: string;
};

const SitePageContent = ({ slug, fallbackTitle, badge = "Legal" }: Props) => {
  const { page, loading } = useSitePage(slug);
  const title = page?.title || fallbackTitle;
  const html = page?.content_html ?? "";

  return (
    <div className="bg-background">
      <section className="bg-gradient-to-br from-bansal-blue to-bansal-blue-dark text-white py-14">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <BansalBadge tone="orange" className="mb-3">
            {badge}
          </BansalBadge>
          <h1 className="font-display text-4xl font-extrabold">{title}</h1>
          {page?.updated_at && (
            <p className="text-white/80 text-sm mt-2">
              Last updated: {new Date(page.updated_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </section>
      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
              <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
            </div>
          ) : (
            <div
              className="prose prose-sm md:prose-base max-w-none prose-headings:font-display prose-headings:text-bansal-blue prose-a:text-bansal-orange"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      </section>
    </div>
  );
};

export default SitePageContent;
