import { useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, Loader2, Tag, Trophy } from "lucide-react";
import { useTestSeriesList } from "@/hooks/useTestSeries";
import testSeriesHero from "@/assets/test-series-hero.png";
import { FloatingIcons, DotTexture, GlowBlob } from "@/components/bansal/BansalDecor";

const exams = ["All", "JEE Advanced", "JEE Main", "NEET", "Foundation"];

const TestSeriesCatalogPage = () => {
  const [exam, setExam] = useState("All");
  const { list, loading } = useTestSeriesList(exam);

  return (
    <div className="bg-background">
      <section className="relative overflow-hidden bg-[hsl(var(--navy))] py-16 text-white">
        <img src={testSeriesHero} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--navy))]/85 via-[hsl(var(--navy2))]/75 to-[hsl(222,47%,15%)]/90" />
        <FloatingIcons defaultTone="white" />
        <DotTexture tone="white" className="opacity-30 decor-fade" />
        <div className="container relative z-10 mx-auto px-4 max-w-6xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Trophy className="h-3.5 w-3.5" /> All India Test Series
          </div>
          <h1 className="mt-4 font-display text-4xl md:text-5xl font-black">Test Series & Mocks</h1>
          <p className="mt-3 max-w-2xl text-white/80">
            JEE Main, JEE Advanced, NEET and Foundation test series with AIR predictor and Bansal-grade analytics.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 max-w-6xl py-10 space-y-6">
        <div className="flex flex-wrap gap-2">
          {exams.map((e) => (
            <button
              key={e}
              onClick={() => setExam(e)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                exam === e
                  ? "border-[hsl(var(--bansal-orange))] bg-[hsl(var(--bansal-orange))] text-white"
                  : "border-border bg-card text-foreground hover:border-[hsl(var(--bansal-orange))]"
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-60 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">No test series available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {list.map((t) => {
              const discount = t.discount_percent ?? 0;
              return (
                <Link
                  key={t.id}
                  to={`/test-series/${t.slug}`}
                  className="group rounded-2xl border border-border bg-card p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {t.target_exam && (
                        <span className="rounded-full bg-[hsl(var(--bansal-orange))]/10 px-2.5 py-0.5 text-[10px] font-bold text-[hsl(var(--bansal-orange))]">
                          {t.target_exam}
                        </span>
                      )}
                      <h3 className="mt-2 font-display text-xl font-black text-foreground group-hover:text-primary">
                        {t.title}
                      </h3>
                    </div>
                    {t.is_featured && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Featured
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{t.description}</p>
                  )}
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      <strong className="text-foreground">{t.total_tests}</strong> tests
                    </span>
                    {t.duration_months && (
                      <span>
                        <strong className="text-foreground">{t.duration_months}</strong> months
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-foreground">₹{Number(t.price).toLocaleString()}</span>
                    {t.original_price && Number(t.original_price) > Number(t.price) && (
                      <>
                        <span className="text-sm line-through text-muted-foreground">
                          ₹{Number(t.original_price).toLocaleString()}
                        </span>
                        {discount > 0 && (
                          <span className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-green-600">
                            <Tag className="h-3 w-3" /> {discount}% off
                          </span>
                        )}
                      </>
                    )}
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

export default TestSeriesCatalogPage;
