import { useEffect, useMemo, useState } from "react";
import { Search, ChevronRight, Clock, FileText, Loader2, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

type TestRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  test_type: string;
  exam_pattern: string;
  subjects: string[];
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  is_published: boolean;
  course_id: string | null;
  cbt_allowed_batch_ids: string[] | null;
  test_mode: string | null;
  results_released_at: string | null;
};

type EnrolledCourse = { id: string; name: string; subject: string; slug: string };
type AttemptInfo = { status: string; id: string; slug: string | null };

const GENERAL_KEY = "__general__";

const TestListPage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [tests, setTests] = useState<TestRow[]>([]);
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [attemptStatus, setAttemptStatus] = useState<Record<string, AttemptInfo>>({});
  const [batchId, setBatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [enrollRes, testsRes, attemptsRes, profileRes] = await Promise.all([
        supabase
          .from("enrollments")
          .select("course:courses(id, name, subject, slug)")
          .eq("user_id", user.id)
          .eq("is_active", true),
        supabase
          .from("tests")
          .select("id,title,slug,description,test_type,exam_pattern,subjects,duration_minutes,total_questions,total_marks,is_published,course_id,cbt_allowed_batch_ids")
          .eq("is_published", true)
          .neq("test_mode", "cbt")
          .order("created_at", { ascending: false }),
        supabase.from("test_attempts").select("id, test_id, status, tests(slug)").eq("user_id", user.id),
        supabase.from("profiles").select("batch_id").eq("user_id", user.id).maybeSingle(),
      ]);
      if (!active) return;
      const enrolled = (enrollRes.data ?? [])
        .map((e: any) => e.course)
        .filter(Boolean) as EnrolledCourse[];
      setCourses(enrolled);
      setTests((testsRes.data ?? []) as TestRow[]);
      const map: Record<string, AttemptInfo> = {};
      (attemptsRes.data ?? []).forEach((a: any) => {
        if (!a.test_id) return;
        const prev = map[a.test_id];
        // Prefer submitted over in_progress
        if (!prev || (prev.status === "in_progress" && a.status !== "in_progress")) {
          map[a.test_id] = { id: a.id, status: a.status, slug: a.tests?.slug ?? null };
        }
      });
      setAttemptStatus(map);
      setBatchId((profileRes.data as any)?.batch_id ?? null);
      // open all by default
      const open: Record<string, boolean> = { [GENERAL_KEY]: true };
      enrolled.forEach((c) => { open[c.id] = true; });
      setOpenGroups(open);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  const enrolledCourseIds = useMemo(() => new Set(courses.map((c) => c.id)), [courses]);

  const visibleTests = useMemo(() => {
    return tests.filter((t) => {
      // Always show tests the student has already attempted
      if (attemptStatus[t.id]) return true;
      const allowed = t.cbt_allowed_batch_ids;
      const isOpen = !allowed || allowed.length === 0;
      const inBatch = !!(batchId && allowed?.includes(batchId));
      const inCourse = !!(t.course_id && enrolledCourseIds.has(t.course_id));
      return isOpen || inBatch || inCourse;
    });
  }, [tests, batchId, attemptStatus, enrolledCourseIds]);

  const filteredTests = useMemo(
    () => visibleTests.filter((t) => t.title.toLowerCase().includes(search.toLowerCase())),
    [visibleTests, search],
  );

  const grouped = useMemo(() => {
    const groups: { key: string; label: string; tests: TestRow[] }[] = [];
    courses.forEach((c) => {
      const list = filteredTests.filter((t) => t.course_id === c.id);
      groups.push({ key: c.id, label: c.name, tests: list });
    });
    const general = filteredTests.filter((t) => !t.course_id || !courses.find((c) => c.id === t.course_id));
    groups.push({ key: GENERAL_KEY, label: "General Practice", tests: general });
    return groups;
  }, [filteredTests, courses]);

  const toggleGroup = (key: string) =>
    setOpenGroups((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div className="pb-20 lg:pb-0">
      <div className="bg-[hsl(var(--navy))] grid-texture px-4 pt-4 pb-3">
        <h1 className="text-lg font-black font-display text-white">My Live Tests</h1>
        <p className="text-xs text-white/70">{filteredTests.length} test{filteredTests.length === 1 ? "" : "s"} available</p>
      </div>

      <div className="p-4 lg:p-6 space-y-4">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            placeholder="Search for tests..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="font-display text-lg font-bold text-foreground">No tests yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Check back soon — new tests are added regularly.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => {
              if (group.tests.length === 0) return null;
              const open = !!openGroups[group.key];
              return (
                <section key={group.key} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-foreground">{group.label}</p>
                        <p className="text-[11px] text-muted-foreground">{group.tests.length} test{group.tests.length === 1 ? "" : "s"}</p>
                      </div>
                    </div>
                    <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
                  </button>
                  {open && (
                    <div className="border-t border-border divide-y divide-border">
                      {group.tests.map((t) => {
                        const att = attemptStatus[t.id];
                        const isSubmitted = att && (att.status === "submitted" || att.status === "auto_submitted");
                        const isInProgress = att?.status === "in_progress";
                        const href = isSubmitted
                          ? `/tests/${att.slug ?? t.slug}/result/${att.id}`
                          : isInProgress
                            ? `/tests/${t.slug}/take`
                            : `/tests/${t.slug}/instructions`;
                        return (
                          <Link
                            key={t.id}
                            to={href}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary shrink-0">
                              <FileText className="h-4.5 w-4.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-primary uppercase">{t.test_type} · {t.exam_pattern}</p>
                              <h3 className="text-sm font-bold text-foreground mt-0.5">{t.title}</h3>
                              <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {t.total_questions} Qs</span>
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t.duration_minutes} min</span>
                                {t.subjects?.length > 0 && <span>{t.subjects.join(" · ")}</span>}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {isSubmitted && (
                                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700">View Result</span>
                              )}
                              {isInProgress && (
                                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-600">Resume</span>
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestListPage;
