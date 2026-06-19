import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Users, IndianRupee, BookOpen, ArrowRight, Loader2, Inbox, Briefcase, Flag,
  Building2, Trophy, MessageSquareWarning, Megaphone, Sparkles, PlusCircle, Image as ImageIcon,
  Star, TrendingUp, ClipboardCheck, Upload, Youtube,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import { formatDistanceToNow, format, subDays, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

type ProfileRow = { user_id: string; full_name: string | null; plan: string; created_at: string; country: string | null; centre_id: string | null };
type CourseRow = { id: string; name: string; educator_name: string; total_enrolled: number | null; rating: number | null; price: number };
type EnrollmentRow = { id: string; course_id: string; created_at: string };
type LiveClassRow = { id: string; title: string; educator_name: string; status: string; starts_at: string };
type CentreRow = { id: string; city: string; state: string; slug: string; region: string; is_hq: boolean };
type EnquiryRow = { id: string; name: string; email: string; source_type: string; status: string; priority: string; created_at: string; centre_id: string | null };
type BoostRow = { id: string; full_name: string; class_level: string | null; target_exam: string | null; city: string | null; admit_card_number: string | null; payment_status: string | null; created_at: string };

const fetchOverview = async () => {
  const todayStart = startOfDay(new Date()).toISOString();
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

  const [
    profilesRes, coursesRes, enrollmentsRes, liveRes, attemptsRes,
    eduRes, enqOpenRes, repRes, supportRes,
    centresRes, recentEnqRes, toppersRes,
    testsLiveRes, testsTotalRes, qbankRes,
    recentBoostRes,
  ] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name, plan, created_at, country, centre_id").order("created_at", { ascending: false }).limit(500),
    supabase.from("courses").select("id, name, educator_name, total_enrolled, rating, price").eq("is_published", true),
    supabase.from("enrollments").select("id, course_id, created_at").gte("created_at", thirtyDaysAgo),
    supabase.from("live_classes").select("id, title, educator_name, status, starts_at").in("status", ["live", "scheduled"]).order("starts_at", { ascending: true }).limit(8),
    supabase.from("test_attempts").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
    supabase.from("educator_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("enquiries").select("id", { count: "exact", head: true }).eq("source_type", "center_support").neq("status", "closed"),
    supabase.from("centres").select("id, city, state, slug, region, is_hq, is_pinned").eq("is_published", true).order("is_pinned", { ascending: false }).order("city", { ascending: true }),
    supabase.from("enquiries").select("id, name, email, source_type, status, priority, created_at, centre_id").order("created_at", { ascending: false }).limit(8),
    supabase.from("toppers").select("id", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("tests").select("id", { count: "exact", head: true }).eq("is_published", true).gte("starts_at", todayStart),
    supabase.from("tests").select("id", { count: "exact", head: true }),
    supabase.from("question_bank").select("id", { count: "exact", head: true }),
    supabase.from("boost_registrations").select("id, full_name, class_level, target_exam, city, admit_card_number, payment_status, created_at").order("created_at", { ascending: false }).limit(8),
  ]);

  return {
    profiles: (profilesRes.data ?? []) as ProfileRow[],
    courses: (coursesRes.data ?? []) as CourseRow[],
    enrollments: (enrollmentsRes.data ?? []) as EnrollmentRow[],
    liveClasses: (liveRes.data ?? []) as LiveClassRow[],
    centres: (centresRes.data ?? []) as CentreRow[],
    recentEnq: (recentEnqRes.data ?? []) as EnquiryRow[],
    testAttemptsToday: attemptsRes.count ?? 0,
    testsUpcoming: testsLiveRes.count ?? 0,
    testsTotal: testsTotalRes.count ?? 0,
    questionBankCount: qbankRes.count ?? 0,
    toppersCount: toppersRes.count ?? 0,
    pending: {
      educators: eduRes.count ?? 0,
      enquiries: enqOpenRes.count ?? 0,
      reports: repRes.count ?? 0,
      centreSupport: supportRes.count ?? 0,
    },
  };
};

const formatINR = (v: number) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
};

const enquiryTone: Record<string, string> = {
  landing_cta: "bg-bansal-orange/10 text-bansal-orange",
  center_support: "bg-rose-100 text-rose-700",
  center_course: "bg-bansal-blue/10 text-bansal-blue",
  contact: "bg-muted text-muted-foreground",
};

const AdminDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview-v2"],
    queryFn: fetchOverview,
    staleTime: 5 * 60 * 1000,
  });

  const profiles = data?.profiles ?? [];
  const courses = data?.courses ?? [];
  const enrollments = data?.enrollments ?? [];
  const liveClasses = data?.liveClasses ?? [];
  const centres = data?.centres ?? [];
  const recentEnq = data?.recentEnq ?? [];
  const pending = data?.pending ?? { educators: 0, enquiries: 0, reports: 0, centreSupport: 0 };
  const toppersCount = data?.toppersCount ?? 0;
  const testAttemptsToday = data?.testAttemptsToday ?? 0;
  const testsUpcoming = data?.testsUpcoming ?? 0;
  const testsTotal = data?.testsTotal ?? 0;
  const questionBankCount = data?.questionBankCount ?? 0;

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const monthlyRevenue = useMemo(
    () => enrollments.reduce((s, e) => s + Number(courseById.get(e.course_id)?.price ?? 0), 0),
    [enrollments, courseById],
  );

  const newUsersToday = useMemo(() => {
    const t = startOfDay(new Date()).getTime();
    return profiles.filter((p) => new Date(p.created_at).getTime() >= t).length;
  }, [profiles]);

  const offlineStudents = profiles.filter((p) => p.centre_id).length;

  const kpis = [
    { label: "Students", value: profiles.length.toLocaleString(), sub: `+${newUsersToday} today`, Icon: Users, tone: "from-bansal-blue to-bansal-blue/70", to: "/admin/students" },
    { label: "Active Courses", value: courses.length.toString(), sub: `${courses.reduce((s, c) => s + (c.total_enrolled ?? 0), 0)} learners`, Icon: BookOpen, tone: "from-bansal-orange to-amber-500", to: "/admin/courses" },
    { label: "Tests", value: testsTotal.toString(), sub: `${testAttemptsToday} attempts today · ${testsUpcoming} upcoming`, Icon: ClipboardCheck, tone: "from-indigo-600 to-purple-500", to: "/admin/tests-hub" },
    { label: "Question Bank", value: questionBankCount.toLocaleString(), sub: "Total questions", Icon: Upload, tone: "from-cyan-600 to-sky-500", to: "/admin/tests-hub?tab=bank" },
    { label: "Centres Live", value: centres.length.toString(), sub: `${offlineStudents} offline students mapped`, Icon: Building2, tone: "from-emerald-600 to-teal-500", to: "/admin/centres" },
    { label: "Revenue (30d)", value: formatINR(monthlyRevenue), sub: `${enrollments.length} enrolments`, Icon: IndianRupee, tone: "from-rose-500 to-orange-500", to: "/admin/payments" },
    { label: "New Enquiries", value: pending.enquiries.toString(), sub: "Awaiting reply", Icon: Inbox, tone: "from-violet-600 to-fuchsia-500", to: "/admin/enquiries" },
    { label: "Centre Tickets", value: pending.centreSupport.toString(), sub: "Open complaints", Icon: MessageSquareWarning, tone: "from-sky-600 to-indigo-500", to: "/admin/center-support" },
  ];

  const revenueData = useMemo(() => {
    const buckets: Record<string, { day: string; revenue: number; enrols: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "dd MMM");
      buckets[d] = { day: d, revenue: 0, enrols: 0 };
    }
    enrollments.forEach((e) => {
      const k = format(new Date(e.created_at), "dd MMM");
      if (buckets[k]) {
        buckets[k].revenue += Number(courseById.get(e.course_id)?.price ?? 0);
        buckets[k].enrols += 1;
      }
    });
    return Object.values(buckets);
  }, [enrollments, courseById]);

  const centresGlance = useMemo(() => {
    const studentsByCentre = new Map<string, number>();
    profiles.forEach((p) => {
      if (p.centre_id) studentsByCentre.set(p.centre_id, (studentsByCentre.get(p.centre_id) ?? 0) + 1);
    });
    const ticketsByCentre = new Map<string, number>();
    recentEnq.forEach((e) => {
      if (e.source_type === "center_support" && e.centre_id && e.status !== "closed") {
        ticketsByCentre.set(e.centre_id, (ticketsByCentre.get(e.centre_id) ?? 0) + 1);
      }
    });
    return [...centres]
      .map((c) => ({
        ...c,
        students: studentsByCentre.get(c.id) ?? 0,
        tickets: ticketsByCentre.get(c.id) ?? 0,
      }))
      .sort((a, b) => b.students - a.students)
      .slice(0, 6);
  }, [centres, profiles, recentEnq]);

  const topCourses = useMemo(() => {
    return [...courses]
      .sort((a, b) => (b.total_enrolled ?? 0) - (a.total_enrolled ?? 0))
      .slice(0, 5);
  }, [courses]);

  const liveNow = liveClasses.filter((c) => c.status === "live");
  const upcoming = liveClasses.filter((c) => c.status === "scheduled").slice(0, 4);

  const quickActions = [
    { label: "New Test", to: "/admin/tests/new", Icon: ClipboardCheck, tone: "bg-indigo-600 text-white" },
    { label: "Bulk Q Import", to: "/admin/tests-hub?tab=imports", Icon: Upload, tone: "bg-cyan-600 text-white" },
    { label: "New Course", to: "/admin/courses", Icon: BookOpen, tone: "bg-bansal-blue text-white" },
    { label: "Lecture Bucket", to: "/admin/lecture-bucket", Icon: Youtube, tone: "bg-rose-500 text-white" },
    { label: "Add Centre", to: "/admin/centres", Icon: Building2, tone: "bg-emerald-600 text-white" },
    { label: "New Banner", to: "/admin/banners", Icon: ImageIcon, tone: "bg-bansal-orange text-white" },
    { label: "Add Topper", to: "/admin/toppers", Icon: Trophy, tone: "bg-amber-500 text-white" },
    { label: "Testimonial", to: "/admin/testimonials", Icon: Star, tone: "bg-violet-600 text-white" },
    { label: "Broadcast", to: "/admin/notifications", Icon: Megaphone, tone: "bg-pink-600 text-white" },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 pb-24 lg:pb-6">
      {/* Greeting */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-extrabold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-bansal-orange" /> Command Centre
          </h1>
          <p className="text-xs text-muted-foreground">
            {format(new Date(), "EEEE, dd MMM yyyy")} · Live snapshot across centres, courses & revenue.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          {toppersCount} toppers on wall · {centres.length} centres live
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {kpis.map((k) => (
          <Link key={k.label} to={k.to} className="group relative rounded-2xl overflow-hidden border border-border bg-card hover-lift">
            <div className={`absolute inset-0 bg-gradient-to-br ${k.tone} opacity-10 group-hover:opacity-20 transition-opacity`} />
            <div className="relative p-4">
              <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${k.tone} text-white grid place-items-center shadow`}>
                <k.Icon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-xl font-extrabold text-foreground">{k.value}</p>
              <p className="text-[11px] font-semibold text-muted-foreground">{k.label}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/80">{k.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">Revenue · Last 30 Days</h2>
            <Link to="/admin/payments" className="text-[11px] text-bansal-orange font-semibold inline-flex items-center gap-0.5">
              Details <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(24,95%,53%)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(24,95%,53%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatINR(v)} />
              <Tooltip formatter={(v: number) => [formatINR(v), "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(24,95%,53%)" fill="url(#revG)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground">Enrolments · Last 30 Days</h2>
            <Link to="/admin/students" className="text-[11px] text-bansal-blue font-semibold inline-flex items-center gap-0.5">
              Students <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="enrols" fill="hsl(217,71%,28%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Centres + Top courses */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-emerald-600" /> Centres at a Glance
            </h2>
            <Link to="/admin/centres" className="text-[11px] text-bansal-blue font-semibold inline-flex items-center gap-0.5">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {centresGlance.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No centres yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium">Centre</th>
                  <th className="text-left py-2 font-medium">Region</th>
                  <th className="text-right py-2 font-medium">Students</th>
                  <th className="text-right py-2 font-medium">Tickets</th>
                </tr>
              </thead>
              <tbody>
                {centresGlance.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="py-2.5">
                      <Link to={`/centres/${c.slug}`} className="font-medium text-foreground hover:text-bansal-orange">
                        {c.city} {c.is_hq && <span className="text-[9px] text-bansal-orange ml-1">HQ</span>}
                      </Link>
                      <div className="text-[10px] text-muted-foreground">{c.state}</div>
                    </td>
                    <td className="py-2.5 text-muted-foreground capitalize">{c.region}</td>
                    <td className="py-2.5 text-right font-semibold text-foreground">{c.students}</td>
                    <td className="py-2.5 text-right">
                      <span className={`font-bold ${c.tickets > 0 ? "text-rose-600" : "text-muted-foreground"}`}>{c.tickets}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-amber-500" /> Top Courses
            </h2>
            <Link to="/admin/courses" className="text-[11px] text-bansal-blue font-semibold inline-flex items-center gap-0.5">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {topCourses.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No courses yet.</p>
          ) : (
            <div className="space-y-2">
              {topCourses.map((c, i) => {
                const rev = (c.total_enrolled ?? 0) * Number(c.price ?? 0);
                return (
                  <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5 hover:bg-muted/50 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-bansal-orange/10 text-bansal-orange font-display font-extrabold text-sm grid place-items-center">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{c.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{c.educator_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-bansal-blue">{c.total_enrolled ?? 0}</div>
                      <div className="text-[10px] text-emerald-600">{formatINR(rev)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Enquiries + Live + Moderation */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Inbox className="h-4 w-4 text-violet-600" /> Recent Enquiries
            </h2>
            <Link to="/admin/enquiries" className="text-[11px] text-bansal-blue font-semibold inline-flex items-center gap-0.5">
              Inbox <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentEnq.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">No enquiries yet.</p>
          ) : (
            <div className="space-y-2">
              {recentEnq.map((e) => (
                <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">{e.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{e.email}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${enquiryTone[e.source_type] ?? enquiryTone.contact}`}>
                    {e.source_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-muted-foreground w-20 text-right shrink-0">
                    {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-bold text-foreground mb-3">Live Today</h2>
            {liveNow.length === 0 && upcoming.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Nothing scheduled.</p>
            ) : (
              <div className="space-y-2">
                {liveNow.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{c.title}</div>
                      <div className="text-[10px] text-muted-foreground">{c.educator_name}</div>
                    </div>
                    <span className="text-[10px] font-bold text-rose-600">LIVE</span>
                  </div>
                ))}
                {upcoming.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{c.title}</div>
                      <div className="text-[10px] text-muted-foreground">{c.educator_name}</div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(c.starts_at), "HH:mm")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-bold text-foreground mb-3">Pending Approvals</h2>
            {[
              { label: "Educator applications", count: pending.educators, link: "/admin/educator-applications", Icon: Briefcase },
              { label: "Centre support", count: pending.centreSupport, link: "/admin/center-support", Icon: MessageSquareWarning },
              { label: "Reported content", count: pending.reports, link: "/admin/reports", Icon: Flag },
            ].map((a) => (
              <Link key={a.label} to={a.link} className="flex items-center justify-between rounded-lg px-2.5 py-2 hover:bg-muted transition-colors">
                <span className="flex items-center gap-2 text-xs text-foreground">
                  <a.Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {a.label}
                </span>
                <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${a.count > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                  {a.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
          <PlusCircle className="h-4 w-4 text-bansal-orange" /> Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2">
          {quickActions.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="group rounded-xl border border-border p-3 text-center hover-lift hover:border-bansal-orange/50 transition-all"
            >
              <div className={`h-9 w-9 rounded-lg ${a.tone} grid place-items-center mx-auto shadow`}>
                <a.Icon className="h-4 w-4" />
              </div>
              <div className="mt-2 text-[11px] font-semibold text-foreground">{a.label}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
