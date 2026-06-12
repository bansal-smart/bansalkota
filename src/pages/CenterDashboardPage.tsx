import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Inbox, ClipboardList, Users, LifeBuoy, Image as ImageIcon, ArrowRight, Building2 } from "lucide-react";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { supabase } from "@/integrations/supabase/client";

type Counts = {
  banners: number;
  courses: number;
  websiteEnquiries: number;
  courseEnquiries: number;
  students: number;
  openSupport: number;
};

const CenterDashboardPage = () => {
  const { primaryCenterId, primaryCenter, loading } = useCenterAdmin();
  const [counts, setCounts] = useState<Counts>({
    banners: 0,
    courses: 0,
    websiteEnquiries: 0,
    courseEnquiries: 0,
    students: 0,
    openSupport: 0,
  });

  useEffect(() => {
    if (!primaryCenterId) return;
    (async () => {
      const cId = primaryCenterId;
      const [banners, courses, web, courseE, students, support] = await Promise.all([
        (supabase as any).from("center_banners" as any).select("id", { count: "exact", head: true }).eq("center_id", cId),
        (supabase as any).from("center_courses" as any).select("id", { count: "exact", head: true }).eq("center_id", cId),
        (supabase as any).from("enquiries" as any).select("id", { count: "exact", head: true }).eq("center_id" as any, cId),
        (supabase as any).from("center_course_enquiries" as any).select("id", { count: "exact", head: true }).eq("center_id", cId).eq("status", "new"),
        (supabase as any).from("profiles" as any).select("id", { count: "exact", head: true }).eq("center_id" as any, cId),
        (supabase as any).from("enquiries" as any).select("id", { count: "exact", head: true }).eq("center_id" as any, cId).eq("source", "center_support").neq("status", "resolved"),
      ]);
      setCounts({
        banners: banners.count ?? 0,
        courses: courses.count ?? 0,
        websiteEnquiries: web.count ?? 0,
        courseEnquiries: courseE.count ?? 0,
        students: students.count ?? 0,
        openSupport: support.count ?? 0,
      });
    })();
  }, [primaryCenterId]);

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading centre…</div>;
  }
  if (!primaryCenterId) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold text-foreground">No centre assigned yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account does not have a centre mapped. Please contact the Bansal super admin to be assigned.
          </p>
        </div>
      </div>
    );
  }

  const tiles = [
    { label: "Centre Content", value: "Page", icon: Building2, to: "/center/content" },
    { label: "Page Banners", value: counts.banners, icon: ImageIcon, to: "/center/banners" },
    { label: "Offline Courses", value: counts.courses, icon: BookOpen, to: "/center/courses" },
    { label: "Website Enquiries", value: counts.websiteEnquiries, icon: Inbox, to: "/center/enquiries" },
    { label: "New Course Enquiries", value: counts.courseEnquiries, icon: ClipboardList, to: "/center/course-enquiries" },
    { label: "Mapped Students", value: counts.students, icon: Users, to: "/center/students" },
    { label: "Open Support Tickets", value: counts.openSupport, icon: LifeBuoy, to: "/center/support" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black font-display text-foreground">
          Welcome, {primaryCenter?.city}
        </h1>
        <p className="text-sm text-muted-foreground">Manage your centre page, website content, banners, enquiries and students.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <t.icon className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            </div>
            <p className="mt-4 text-3xl font-black font-display text-foreground">{t.value}</p>
            <p className="text-sm text-muted-foreground">{t.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CenterDashboardPage;
