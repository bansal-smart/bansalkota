import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Loader2, ShoppingCart, Tag, Truck, ShieldCheck } from "lucide-react";
import { useBookDetail } from "@/hooks/useBooks";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";

const BookDetailPage = () => {
  const { slug } = useParams();
  const { book, loading } = useBookDetail(slug);
  const { addToCart } = useAppStore();

  const handleAdd = () => {
    if (!book) return;
    addToCart({
      type: "book",
      id: book.id,
      title: book.title,
      price: Number(book.price),
      cover_url: book.cover_url,
    });
    toast.success("Added to cart");
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Book not found</h1>
        <Link to="/e-store" className="mt-4 inline-block text-primary underline">
          Back to store
        </Link>
      </div>
    );
  }

  const discount =
    book.original_price && book.original_price > book.price
      ? Math.round((1 - Number(book.price) / Number(book.original_price)) * 100)
      : 0;

  return (
    <div className="bg-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Link to="/e-store" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to E-Store
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(var(--bansal-orange))]/15 to-[hsl(var(--navy))]/10">
            {book.cover_url ? (
              <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
            ) : (
              <BookOpen className="h-32 w-32 text-[hsl(var(--bansal-orange))]" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap gap-2">
              {book.target_exam && (
                <span className="rounded-full bg-[hsl(var(--bansal-orange))]/10 px-3 py-1 text-xs font-bold text-[hsl(var(--bansal-orange))]">
                  {book.target_exam}
                </span>
              )}
              {book.class_level && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {book.class_level}
                </span>
              )}
            </div>
            <h1 className="mt-3 font-display text-3xl font-black text-foreground md:text-4xl">{book.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">By {book.author}</p>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-3xl font-black text-foreground">₹{Number(book.price).toLocaleString()}</span>
              {book.original_price && Number(book.original_price) > Number(book.price) && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    ₹{Number(book.original_price).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-green-600">
                    <Tag className="h-4 w-4" /> {discount}% off
                  </span>
                </>
              )}
            </div>

            {book.description && (
              <div
                className="prose prose-sm sm:prose-base mt-6 max-w-none text-muted-foreground [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1"
                dangerouslySetInnerHTML={{ __html: book.description }}
              />
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                disabled={book.stock === 0}
                onClick={handleAdd}
                className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--bansal-orange))] px-6 py-3 font-bold text-white hover:bg-[hsl(var(--bansal-orange))]/90 disabled:opacity-50"
              >
                <ShoppingCart className="h-4 w-4" />
                {book.stock === 0 ? "Out of stock" : "Add to Cart"}
              </button>
              <Link
                to="/e-store/checkout"
                onClick={handleAdd}
                className="inline-flex items-center gap-2 rounded-xl border border-[hsl(var(--bansal-orange))] px-6 py-3 font-bold text-[hsl(var(--bansal-orange))] hover:bg-[hsl(var(--bansal-orange))]/10"
              >
                Buy Now
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border p-3">
                <Truck className="h-5 w-5 text-[hsl(var(--bansal-orange))]" />
                <p className="mt-1 text-xs font-bold">Free shipping over ₹500</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <ShieldCheck className="h-5 w-5 text-[hsl(var(--bansal-orange))]" />
                <p className="mt-1 text-xs font-bold">7-day replacement</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookDetailPage;
