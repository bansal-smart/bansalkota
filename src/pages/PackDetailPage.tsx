import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Boxes, Loader2, ShoppingCart, Tag } from "lucide-react";
import { usePackDetail } from "@/hooks/useModulePacks";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

const PackDetailPage = () => {
  const { slug } = useParams();
  const { pack, items, loading } = usePackDetail(slug);
  const { addToCart } = useAppStore();

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Module pack not found</h1>
        <Link to="/e-store" className="mt-4 inline-block text-primary underline">
          Back to E-Store
        </Link>
      </div>
    );
  }

  const discount =
    pack.original_price && pack.original_price > pack.price
      ? Math.round((1 - Number(pack.price) / Number(pack.original_price)) * 100)
      : 0;

  return (
    <div className="bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Link to="/e-store" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to E-Store
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="aspect-[4/5] flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(var(--bansal-orange))]/15 to-[hsl(var(--navy))]/10">
            {pack.cover_url ? (
              <img src={pack.cover_url} alt={pack.title} className="h-full w-full object-contain p-4" />
            ) : (
              <Boxes className="h-32 w-32 text-[hsl(var(--bansal-orange))]" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[hsl(var(--bansal-orange))]/10 px-3 py-1 text-xs font-bold text-[hsl(var(--bansal-orange))]">
                Module Pack
              </span>
              {pack.target_exam && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {pack.target_exam}
                </span>
              )}
              {pack.class_level && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {pack.class_level}
                </span>
              )}
            </div>
            <h1 className="mt-3 font-display text-3xl font-black text-foreground md:text-4xl">{pack.title}</h1>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-3xl font-black text-foreground">₹{Number(pack.price).toLocaleString()}</span>
              {pack.original_price && Number(pack.original_price) > Number(pack.price) && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    ₹{Number(pack.original_price).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-green-600">
                    <Tag className="h-4 w-4" /> {discount}% off
                  </span>
                </>
              )}
            </div>

            {pack.description && <p className="mt-6 leading-relaxed text-muted-foreground">{pack.description}</p>}

            <div className="mt-8">
              <button
                onClick={() => {
                  addToCart({
                    type: "pack",
                    id: pack.id,
                    title: pack.title,
                    price: Number(pack.price),
                    cover_url: pack.cover_url,
                  });
                  toast.success("Added to cart");
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--bansal-orange))] px-6 py-3 font-bold text-white hover:bg-[hsl(var(--bansal-orange))]/90"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </button>
            </div>

            <div className="mt-10">
              <h2 className="mb-3 font-bold">What's included ({items.length} books)</h2>
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-muted">
                      {it.book?.cover_url ? (
                        <img src={it.book.cover_url} alt={it.book.title} className="h-full w-full object-contain p-1" />
                      ) : null}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{it.book?.title ?? "Book"}</p>
                      {it.book?.author && <p className="text-xs text-muted-foreground">{it.book.author}</p>}
                    </div>
                    {it.book?.price != null && (
                      <span className="text-sm text-muted-foreground">₹{Number(it.book.price).toLocaleString()}</span>
                    )}
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-sm text-muted-foreground">No books linked to this pack yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackDetailPage;
