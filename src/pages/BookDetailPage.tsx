import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Loader2, ShoppingCart, Tag, Truck, ShieldCheck } from "lucide-react";
import { useBookDetail } from "@/hooks/useBooks";
import { useAppStore } from "@/store/useAppStore";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const BookDetailPage = () => {
  const { slug } = useParams();
  const { book, loading } = useBookDetail(slug);
  const { user } = useAppStore();
  const [placing, setPlacing] = useState(false);

  const handleBuy = async () => {
    if (!user) {
      toast.error("Please sign in to purchase");
      return;
    }
    if (!book) return;
    setPlacing(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        subtotal: book.price,
        total: book.price,
        currency: "INR",
        status: "pending",
      })
      .select("id")
      .single();
    if (!error && order) {
      await supabase.from("order_items").insert({
        order_id: order.id,
        item_type: "book",
        item_id: book.id,
        item_title: book.title,
        unit_price: book.price,
        quantity: 1,
      });
    }
    setPlacing(false);
    if (error) toast.error("Could not place order");
    else toast.success("Order placed — proceed to checkout for payment.");
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
      <div className="container mx-auto px-4 max-w-6xl py-8">
        <Link to="/e-store" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to E-Store
        </Link>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="aspect-[4/5] rounded-2xl bg-gradient-to-br from-[hsl(var(--bansal-orange))]/15 to-[hsl(var(--navy))]/10 flex items-center justify-center overflow-hidden">
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
            <h1 className="mt-3 font-display text-3xl md:text-4xl font-black text-foreground">{book.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">By {book.author}</p>

            <div className="mt-6 flex items-baseline gap-3">
              <span className="text-3xl font-black text-foreground">₹{Number(book.price).toLocaleString()}</span>
              {book.original_price && Number(book.original_price) > Number(book.price) && (
                <>
                  <span className="text-lg line-through text-muted-foreground">
                    ₹{Number(book.original_price).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-green-600">
                    <Tag className="h-4 w-4" /> {discount}% off
                  </span>
                </>
              )}
            </div>

            {book.description && <p className="mt-6 text-muted-foreground leading-relaxed">{book.description}</p>}

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                disabled={placing || book.stock === 0}
                onClick={handleBuy}
                className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--bansal-orange))] px-6 py-3 font-bold text-white hover:bg-[hsl(var(--bansal-orange))]/90 disabled:opacity-50"
              >
                {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
                {book.stock === 0 ? "Out of stock" : "Buy Now"}
              </button>
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
