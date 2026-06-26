import { useEffect, useState } from "react";
import { Search, Eye, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePagination } from "@/hooks/usePagination";
import CenterCourseStudentsDialog from "@/components/CenterCourseStudentsDialog";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import TablePagination from "@/components/TablePagination";

type PlatformCourse = {
  id: string;
  name: string;
  slug: string;
  educator_name: string;
  is_published: boolean;
  total_enrolled: number;
  price: number;
  created_at: string;
  sort_order: number;
  chapter_count?: number;
  test_count?: number;
  lesson_count?: number;
};

const CenterPlatformCoursesPage = () => {
  const { primaryCenterId } = useCenterAdmin();
  const [courses, setCourses] = useState<PlatformCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [manageCourse, setManageCourse] = useState<{ id: string; name: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("courses")
      .select("id, name, slug, educator_name, is_published, total_enrolled, price, created_at, sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    const base = (data ?? []) as PlatformCourse[];

    const ids = base.map((c) => c.id);
    if (ids.length) {
      const [chaptersRes, testsRes, lessonsRes] = await Promise.all([
        supabase.from("chapters").select("course_id").in("course_id", ids),
        supabase.from("tests").select("course_id").in("course_id", ids),
        supabase.from("lessons").select("course_id").in("course_id", ids),
      ]);
      const countBy = (rows: any[] | null) => {
        const m: Record<string, number> = {};
        (rows ?? []).forEach((r) => { m[r.course_id] = (m[r.course_id] ?? 0) + 1; });
        return m;
      };
      const cMap = countBy(chaptersRes.data as any);
      const tMap = countBy(testsRes.data as any);
      const lMap = countBy(lessonsRes.data as any);
      base.forEach((c) => {
        c.chapter_count = cMap[c.id] ?? 0;
        c.test_count = tMap[c.id] ?? 0;
        c.lesson_count = lMap[c.id] ?? 0;
      });
    }
    setCourses(base);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("center-platform-courses-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "courses" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = courses.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.educator_name.toLowerCase().includes(search.toLowerCase()),
  );
  const { paged, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 15);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="rounded-2xl bg-[#1C3F8E] p-6 text-white">
        <h1 className="text-2xl font-black font-display">Online Courses</h1>
        <p className="text-white/90 text-sm mt-1">All platform courses available across Bansal Classes</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses or educators..."
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No courses found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Educator</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Chapters</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Lectures</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Tests</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Students</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.educator_name}</td>
                    <td className="px-4 py-3 text-center text-xs text-foreground">{c.chapter_count ?? 0}</td>
                    <td className="px-4 py-3 text-center text-xs text-foreground">{c.lesson_count ?? 0}</td>
                    <td className="px-4 py-3 text-center text-xs text-foreground">{c.test_count ?? 0}</td>
                    <td className="px-4 py-3 text-center text-xs text-foreground">{(c.total_enrolled ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.is_published ? "bg-secondary/20 text-secondary" : "bg-amber-500/20 text-amber-600"}`}>
                        {c.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          onClick={() => setManageCourse({ id: c.id, name: c.name })}
                          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                          title="Manage Students"
                        >
                          <Users className="h-3 w-3" />
                          Manage Students
                        </button>
                        <a href={`/courses/${c.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors" title="Preview">
                          <Eye className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CenterPlatformCoursesPage;
