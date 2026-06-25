import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, ShoppingCart, Tag, Trophy, BookOpen, Video, ClipboardList, Shirt, Umbrella, HelpCircle, Backpack } from "lucide-react";
import { useTestSeriesDetail } from "@/hooks/useTestSeries";
import { useAppStore } from "@/store/useAppStore";
import { startCashfreeCheckout } from "@/lib/cashfree";
import { toast } from "sonner";
import { useState } from "react";

const SERVICE_META: Record<string, { icon: any; label: string }> = {
  study_material: { icon: BookOpen, label: "Study Material" },
  recorded_lectures: { icon: Video, label: "Recorded Lectures" },
  test_series: { icon: ClipboardList, label: "Test Series" },
  t_shirt: { icon: Shirt, label: "T-Shirt" },
  umbrella: { icon: Umbrella, label: "Umbrella" },
  doubt_classes: { icon: HelpCircle, label: "Doubt Classes" },
  bag: { icon: Backpack, label: "Bag" },
};

const TestSeriesDetailPage = () => {
  const { slug } = useParams();
  const { item, loading } = useTestSeriesDetail(slug);
  const { user } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [placing, setPlacing] = useState(false);

  const handleEnroll = async () => {
    if (!user) {
      toast.info("Please sign in to continue with enrollment");
      const redirect = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?redirect=${redirect}`);
      return;
    }
    if (!item) return;

    setPlacing(true);
    try {
      await startCashfreeCheckout({ orderType: "test_series", testSeriesId: item.id });
    } catch (e) {
      setPlacing(false);
      toast.error((e as Error).message || "Could not start payment");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Test series not found</h1>
        <Link to="/test-series" className="mt-4 inline-block text-primary underline">
          Back to test series
        </Link>
      </div>
    );
  }

  const discount = item.discount_percent ?? 0;
  const services = (item.included_services ?? []).filter((s) => SERVICE_META[s]);
  const shortDesc = item.short_description || item.description;

  return (
    <div className="bg-background">
      <section className="bg-gradient-to-br from-[hsl(var(--navy))] via-[hsl(var(--navy2))] to-[hsl(222,47%,15%)] py-12 text-white">
        <div className="container mx-auto px-4 max-w-6xl">
          <Link to="/test-series" className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> All Test Series
          </Link>
          <div className="mt-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[hsl(var(--bansal-orange))]" />
            {item.target_exam && (
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold">{item.target_exam}</span>
            )}
            {item.mode && <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold">{item.mode}</span>}
            {item.language && <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold">{item.language}</span>}
          </div>
          <h1 className="mt-3 font-display text-3xl md:text-4xl font-black">{item.title}</h1>
          {shortDesc && <p className="mt-3 max-w-3xl text-white/80">{shortDesc}</p>}
        </div>
      </section>

      <section className="container mx-auto px-4 max-w-6xl py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {item.thumbnail_url && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card aspect-[4/3] max-w-md">
              <img src={item.thumbnail_url} alt={item.title} className="h-full w-full object-cover" />
            </div>
          )}

          {(item.features ?? []).length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-bold">What's included</h2>
              <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(item.features ?? []).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[hsl(var(--bansal-orange))]" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-black text-foreground">{item.total_tests}</div>
              <p className="text-xs text-muted-foreground">Total tests</p>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">{item.duration_months ?? "-"}</div>
              <p className="text-xs text-muted-foreground">Months access</p>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">AIR</div>
              <p className="text-xs text-muted-foreground">Rank predictor</p>
            </div>
          </div>

          {item.description_html && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-bold mb-4">Know More Details</h2>
              <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-table:border prose-th:bg-muted prose-th:p-2 prose-td:p-2 prose-td:border" dangerouslySetInnerHTML={{ __html: item.description_html }} />
            </div>
          )}
        </div>

        <aside className="space-y-4 h-fit sticky top-24">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground">₹{Number(item.price).toLocaleString()}</span>
              {item.original_price && Number(item.original_price) > Number(item.price) && (
                <span className="text-sm line-through text-muted-foreground">
                  ₹{Number(item.original_price).toLocaleString()}
                </span>
              )}
            </div>
            {discount > 0 && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-green-600">
                <Tag className="h-3 w-3" /> {discount}% off
              </p>
            )}
            <button
              onClick={handleEnroll}
              disabled={placing}
              className="mt-5 w-full rounded-xl bg-[hsl(var(--bansal-orange))] py-3 font-bold text-white hover:bg-[hsl(var(--bansal-orange))]/90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Enroll Now
            </button>
            <p className="mt-3 text-xs text-muted-foreground">
              Our team will contact you to confirm payment and activate your account.
            </p>
          </div>

          {services.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-bold text-sm mb-3">This Series Includes</h3>
              <ul className="space-y-2">
                {services.map((key) => {
                  const meta = SERVICE_META[key];
                  const Icon = meta.icon;
                  return (
                    <li key={key} className="flex items-center gap-2 text-sm text-foreground">
                      <Icon className="h-4 w-4 text-primary" /> {meta.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
};

export default TestSeriesDetailPage;
