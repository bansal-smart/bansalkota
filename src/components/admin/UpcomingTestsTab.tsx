import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, CalendarClock, Pencil, Eye, Clock } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

type Test = {
  id: string;
  title: string;
  slug: string;
  test_type: string;
  starts_at: string | null;
  ends_at: string | null;
  duration_minutes: number;
  total_questions: number;
  is_published: boolean;
};

const UpcomingTestsTab = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("tests")
        .select(
          "id, title, slug, test_type, starts_at, ends_at, duration_minutes, total_questions, is_published",
        )
        .gt("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(200);
      setTests((data ?? []) as Test[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Upcoming tests</h2>
        <span className="text-xs text-muted-foreground">({tests.length})</span>
      </div>

      {tests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">No scheduled tests</p>
          <p className="text-xs text-muted-foreground mt-1">
            Tests with a future <code>starts_at</code> date will show up here.
          </p>
          <Link
            to="/admin/tests/new"
            className="mt-4 inline-block rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
          >
            Create a test
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                <th className="px-4 py-2 text-left">Test</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Starts</th>
                <th className="px-4 py-2 text-left">Ends</th>
                <th className="px-4 py-2 text-center">Qs / Dur</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium text-foreground">{t.title}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{t.test_type}</td>
                  <td className="px-4 py-2.5 text-xs text-foreground">
                    {t.starts_at ? format(new Date(t.starts_at), "dd MMM yyyy · HH:mm") : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {t.ends_at ? format(new Date(t.ends_at), "dd MMM yyyy · HH:mm") : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs">
                    {t.total_questions} · {t.duration_minutes}m
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        t.is_published
                          ? "bg-secondary/20 text-secondary"
                          : "bg-amber-500/20 text-amber-600"
                      }`}
                    >
                      {t.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Link
                        to={`/admin/tests/${t.slug}`}
                        className="rounded-md px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/10"
                      >
                        Manage
                      </Link>
                      <Link
                        to={`/admin/tests/${t.slug}/edit`}
                        className="rounded-md p-1.5 text-foreground hover:bg-muted"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <a
                        href={`/tests/${t.slug}/take`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                        title="Preview"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UpcomingTestsTab;
