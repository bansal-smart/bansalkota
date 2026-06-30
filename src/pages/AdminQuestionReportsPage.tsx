import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, CheckCircle2, Archive, ExternalLink, Filter } from "lucide-react";
import { toast } from "sonner";
import MathRenderer from "@/components/MathRenderer";


type ReportRow = {
  id: string;
  test_id: string;
  question_id: string;
  attempt_id: string | null;
  user_id: string;
  reason: string;
  details: string | null;
  status: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
};

type TestInfo = { id: string; title: string; slug: string | null };
type QInfo = { id: string; position: number | null; question_text: string | null; subject: string | null };
type Profile = { user_id: string; full_name: string | null; roll_number: string | null };

const STATUS_TABS = ["open", "reviewing", "resolved", "dismissed"] as const;
type Status = (typeof STATUS_TABS)[number];

const STATUS_STYLES: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  reviewing: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-gray-100 text-gray-600",
};

const REASON_LABELS: Record<string, string> = {
  image_not_loading: "Image not loading",
  wrong_answer: "Wrong answer key",
  typo: "Typo / unclear wording",
  out_of_syllabus: "Out of syllabus",
  duplicate: "Duplicate question",
  other: "Other",
};

const AdminQuestionReportsPage = () => {
  const [status, setStatus] = useState<Status>("open");
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [tests, setTests] = useState<Record<string, TestInfo>>({});
  const [questions, setQuestions] = useState<Record<string, QInfo>>({});
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("test_question_reports")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data || []) as ReportRow[];
    setRows(list);

    const tIds = [...new Set(list.map((r) => r.test_id))];
    const qIds = [...new Set(list.map((r) => r.question_id))];
    const uIds = [...new Set(list.map((r) => r.user_id))];

    const [tRes, qRes, pRes, cRes] = await Promise.all([
      tIds.length
        ? supabase.from("tests").select("id,title,slug").in("id", tIds)
        : Promise.resolve({ data: [] as TestInfo[] }),
      qIds.length
        ? supabase
            .from("test_questions")
            .select("id,position,question_text,subject")
            .in("id", qIds)
        : Promise.resolve({ data: [] as QInfo[] }),
      uIds.length
        ? supabase
            .from("profiles")
            .select("user_id,full_name,roll_number")
            .in("user_id", uIds)
        : Promise.resolve({ data: [] as Profile[] }),
      supabase.from("test_question_reports").select("status"),
    ]);

    setTests(Object.fromEntries(((tRes.data as TestInfo[]) || []).map((t) => [t.id, t])));
    setQuestions(Object.fromEntries(((qRes.data as QInfo[]) || []).map((q) => [q.id, q])));
    setProfiles(Object.fromEntries(((pRes.data as Profile[]) || []).map((p) => [p.user_id, p])));

    const c: Record<string, number> = {};
    ((cRes.data as { status: string }[]) || []).forEach((r) => {
      c[r.status] = (c[r.status] || 0) + 1;
    });
    setCounts(c);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const setReportStatus = async (id: string, next: string) => {
    const { error } = await supabase
      .from("test_question_reports")
      .update({
        status: next,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Marked as ${next}`);
    load();
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-red-50 p-2.5 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black font-display">Question Reports</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Issues flagged by students during live tests (image not loading, wrong answer key, typos, etc.)
            </p>
          </div>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
              status === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-primary/50"
            }`}
          >
            <Filter className="h-3 w-3" />
            {s}
            <span className="ml-1 rounded-full bg-background/30 px-1.5 py-0.5 text-[10px]">
              {counts[s] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading reports…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No {status} reports.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((r) => {
              const t = tests[r.test_id];
              const q = questions[r.question_id];
              const p = profiles[r.user_id];
              return (
                <div key={r.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[r.status] || ""}`}>
                          {r.status}
                        </span>
                        <span className="rounded-md bg-orange-50 text-orange-700 px-2 py-0.5 text-[10px] font-bold uppercase">
                          {REASON_LABELS[r.reason] || r.reason}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm font-semibold">
                        {t?.title || "Test"} · Q{q?.position ?? "?"}{" "}
                        {q?.subject && (
                          <span className="text-xs text-muted-foreground font-normal">· {q.subject}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 max-h-40 overflow-auto rounded border border-border bg-muted/20 p-2 [&_img]:max-h-32 [&_img]:inline-block [&_img]:my-1">
                        {q?.question_text ? <MathRenderer html={q.question_text} /> : "—"}
                      </div>

                      {r.details && (
                        <div className="mt-2 rounded-md bg-muted/40 border border-border px-3 py-2 text-xs">
                          <span className="font-semibold">Student note: </span>
                          {r.details}
                        </div>
                      )}
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        Reported by:{" "}
                        <span className="font-medium text-foreground">
                          {p?.full_name || "Student"}
                          {p?.roll_number ? ` (${p.roll_number})` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {t?.slug && (
                        <Link
                          to={`/admin/tests/${t.slug}`}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold hover:bg-muted"
                        >
                          <ExternalLink className="h-3 w-3" /> View test
                        </Link>
                      )}
                      {r.status !== "reviewing" && r.status === "open" && (
                        <button
                          onClick={() => setReportStatus(r.id, "reviewing")}
                          className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-700 px-2.5 py-1.5 text-[11px] font-bold hover:bg-amber-200"
                        >
                          Start review
                        </button>
                      )}
                      {r.status !== "resolved" && (
                        <button
                          onClick={() => setReportStatus(r.id, "resolved")}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-700 px-2.5 py-1.5 text-[11px] font-bold hover:bg-emerald-200"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Resolve
                        </button>
                      )}
                      {r.status !== "dismissed" && (
                        <button
                          onClick={() => setReportStatus(r.id, "dismissed")}
                          className="inline-flex items-center gap-1 rounded-md bg-gray-100 text-gray-700 px-2.5 py-1.5 text-[11px] font-bold hover:bg-gray-200"
                        >
                          <Archive className="h-3 w-3" /> Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminQuestionReportsPage;
