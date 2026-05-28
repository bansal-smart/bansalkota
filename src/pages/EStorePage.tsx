import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Boxes, Loader2, Search, ShoppingBag, ShoppingCart, Tag } from "lucide-react";
import { useBooks } from "@/hooks/useBooks";
import { useModulePacks } from "@/hooks/useModulePacks";
import { useAppStore } from "@/store/useAppStore";
import CartDrawer from "@/components/CartDrawer";
import { toast } from "sonner";
import estoreHero from "@/assets/estore-hero.png";
import { FloatingIcons, DotTexture, GlowBlob } from "@/components/bansal/BansalDecor";

const examFilters = ["All", "JEE Advanced", "JEE Main", "NEET", "Foundation"];
const classFilters = ["All", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];

const EStorePage = () => {
  const [tab, setTab] = useState<"books" | "packs">("books");
  const [exam, setExam] = useState("All");
  const [classLevel, setClassLevel] = useState("All");
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  const { books, loading: booksLoading } = useBooks({ exam, classLevel });
  const { packs, loading: packsLoading } = useModulePacks({ exam, classLevel });
  const { cart, addToCart } = useAppStore();

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      (b.author ?? "").toLowerCase().includes(search.toLowerCase()),
  );
  const filteredPacks = packs.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  return (
    <div className="bg-background">
      <section className="relative overflow-hidden bg-[hsl(var(--navy))] py-16 text-white">
        <img src={estoreHero} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--navy))]/85 via-[hsl(var(--navy2))]/75 to-[hsl(222,47%,15%)]/90" />
        <FloatingIcons defaultTone="white" />
        <DotTexture tone="white" className="opacity-30 decor-fade" />
        <div className="container relative z-10 mx-auto max-w-6xl px-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                <ShoppingBag className="h-3.5 w-3.5" /> Bansal E-Store
              </div>
              <h1 className="mt-4 font-display text-4xl font-black md:text-5xl">Books & Module Packs</h1>
              <p className="mt-3 max-w-2xl text-white/80">
                Printed books, workbooks and curated module bundles authored by Bansal Classes faculty for JEE, NEET and Foundation.
              </p>
            </div>
            <button
              onClick={() => setCartOpen(true)}
              className="relative shrink-0 rounded-xl bg-white/10 p-3 hover:bg-white/20"
              aria-label="Open cart"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[hsl(var(--bansal-orange))] px-1 text-[10px] font-black">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl space-y-6 px-4 py-10">
        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          <button
            onClick={() => setTab("books")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${tab === "books" ? "bg-[hsl(var(--bansal-orange))] text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            <BookOpen className="h-4 w-4" /> Books
          </button>
          <button
            onClick={() => setTab("packs")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition-colors ${tab === "packs" ? "bg-[hsl(var(--bansal-orange))] text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Boxes className="h-4 w-4" /> Module Packs
          </button>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "books" ? "Search books, authors..." : "Search module packs..."}
              className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>
          <select
            value={exam}
            onChange={(e) => setExam(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
          >
            {examFilters.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <select
            value={classLevel}
            onChange={(e) => setClassLevel(e.target.value)}
            className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
          >
            {classFilters.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {tab === "books" ? (
          booksLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredBooks.length === 0 ? (
            <EmptyState icon={BookOpen} label="No books found" />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredBooks.map((b) => {
                const discount =
                  b.original_price && b.original_price > b.price
                    ? Math.round((1 - Number(b.price) / Number(b.original_price)) * 100)
                    : 0;
                return (
                  <div
                    key={b.id}
                    className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-xl"
                  >
                    <Link to={`/e-store/${b.slug}`} className="block">
                      <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-[hsl(var(--bansal-orange))]/15 to-[hsl(var(--navy))]/10">
                        {b.cover_url ? (
                          <img src={b.cover_url} alt={b.title} className="h-full w-full object-contain p-3" />
                        ) : (
                          <BookOpen className="h-16 w-16 text-[hsl(var(--bansal-orange))]" />
                        )}
                      </div>
                    </Link>
                    <div className="space-y-2 p-5">
                      <div className="flex flex-wrap gap-1.5">
                        {b.target_exam && (
                          <span className="rounded-full bg-[hsl(var(--bansal-orange))]/10 px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--bansal-orange))]">
                            {b.target_exam}
                          </span>
                        )}
                        {b.class_level && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            {b.class_level}
                          </span>
                        )}
                      </div>
                      <Link to={`/e-store/${b.slug}`}>
                        <h3 className="line-clamp-2 font-bold leading-snug text-foreground group-hover:text-primary">
                          {b.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-muted-foreground">{b.author}</p>
                      <div className="flex items-center gap-2 pt-2">
                        <span className="text-lg font-black text-foreground">₹{Number(b.price).toLocaleString()}</span>
                        {b.original_price && Number(b.original_price) > Number(b.price) && (
                          <>
                            <span className="text-xs text-muted-foreground line-through">
                              ₹{Number(b.original_price).toLocaleString()}
                            </span>
                            <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-green-600">
                              <Tag className="h-3 w-3" /> {discount}%
                            </span>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          addToCart({
                            type: "book",
                            id: b.id,
                            title: b.title,
                            price: Number(b.price),
                            cover_url: b.cover_url,
                          });
                          toast.success("Added to cart");
                        }}
                        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[hsl(var(--bansal-orange))]/10 py-2 text-xs font-bold text-[hsl(var(--bansal-orange))] hover:bg-[hsl(var(--bansal-orange))]/20"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : packsLoading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredPacks.length === 0 ? (
          <EmptyState icon={Boxes} label="No module packs yet" />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPacks.map((p) => {
              const discount =
                p.original_price && p.original_price > p.price
                  ? Math.round((1 - Number(p.price) / Number(p.original_price)) * 100)
                  : 0;
              return (
                <div
                  key={p.id}
                  className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-xl"
                >
                  <Link to={`/e-store/pack/${p.slug}`}>
                    <div className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-[hsl(var(--bansal-orange))]/15 to-[hsl(var(--navy))]/10">
                      {p.cover_url ? (
                        <img src={p.cover_url} alt={p.title} className="h-full w-full object-contain p-3" />
                      ) : (
                        <Boxes className="h-16 w-16 text-[hsl(var(--bansal-orange))]" />
                      )}
                    </div>
                  </Link>
                  <div className="space-y-2 p-5">
                    <span className="inline-block rounded-full bg-[hsl(var(--bansal-orange))]/10 px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--bansal-orange))]">
                      Module Pack
                    </span>
                    <Link to={`/e-store/pack/${p.slug}`}>
                      <h3 className="line-clamp-2 font-bold leading-snug text-foreground group-hover:text-primary">
                        {p.title}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-lg font-black text-foreground">₹{Number(p.price).toLocaleString()}</span>
                      {p.original_price && Number(p.original_price) > Number(p.price) && (
                        <>
                          <span className="text-xs text-muted-foreground line-through">
                            ₹{Number(p.original_price).toLocaleString()}
                          </span>
                          <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-green-600">
                            <Tag className="h-3 w-3" /> {discount}%
                          </span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        addToCart({
                          type: "pack",
                          id: p.id,
                          title: p.title,
                          price: Number(p.price),
                          cover_url: p.cover_url,
                        });
                        toast.success("Added to cart");
                      }}
                      className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[hsl(var(--bansal-orange))]/10 py-2 text-xs font-bold text-[hsl(var(--bansal-orange))] hover:bg-[hsl(var(--bansal-orange))]/20"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};

const EmptyState = ({ icon: Icon, label }: { icon: typeof BookOpen; label: string }) => (
  <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
    <Icon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
    <p className="font-semibold text-foreground">{label}</p>
    <p className="mt-1 text-sm text-muted-foreground">Try adjusting filters.</p>
  </div>
);

export default EStorePage;
