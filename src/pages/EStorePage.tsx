import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Loader2, Search, ShoppingBag, Tag } from "lucide-react";
import { useBooks } from "@/hooks/useBooks";

const examFilters = ["All", "JEE Advanced", "JEE Main", "NEET", "Foundation"];
const classFilters = ["All", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];

const EStorePage = () => {
  const [exam, setExam] = useState("All");
  const [classLevel, setClassLevel] = useState("All");
  const [search, setSearch] = useState("");
  const { books, loading } = useBooks({ exam, classLevel });

  const filtered = books.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      (b.author ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="bg-background">
      <section className="bg-gradient-to-br from-[hsl(var(--navy))] via-[hsl(var(--navy2))] to-[hsl(222,47%,15%)] py-16 text-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <ShoppingBag className="h-3.5 w-3.5" /> Bansal E-Store
          </div>
          <h1 className="mt-4 font-display text-4xl md:text-5xl font-black">Books & Study Material</h1>
          <p className="mt-3 max-w-2xl text-white/80">
            Printed books, workbooks and study notes authored by Bansal Classes faculty for JEE, NEET and Foundation.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 max-w-6xl py-10 space-y-6">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search books, authors..."
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

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-semibold text-foreground">No books found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try adjusting filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((b) => {
              const discount =
                b.original_price && b.original_price > b.price
                  ? Math.round((1 - Number(b.price) / Number(b.original_price)) * 100)
                  : 0;
              return (
                <Link
                  key={b.id}
                  to={`/e-store/${b.slug}`}
                  className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-xl transition-all"
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-[hsl(var(--bansal-orange))]/15 to-[hsl(var(--navy))]/10 flex items-center justify-center">
                    {b.cover_url ? (
                      <img src={b.cover_url} alt={b.title} className="h-full w-full object-cover" />
                    ) : (
                      <BookOpen className="h-16 w-16 text-[hsl(var(--bansal-orange))]" />
                    )}
                  </div>
                  <div className="p-5 space-y-2">
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
                    <h3 className="font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary">
                      {b.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">{b.author}</p>
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-lg font-black text-foreground">₹{Number(b.price).toLocaleString()}</span>
                      {b.original_price && Number(b.original_price) > Number(b.price) && (
                        <>
                          <span className="text-xs line-through text-muted-foreground">
                            ₹{Number(b.original_price).toLocaleString()}
                          </span>
                          <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-green-600">
                            <Tag className="h-3 w-3" /> {discount}% off
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default EStorePage;
