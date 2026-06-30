// Super Admin Dashboard module catalog — keys used by admin_role_permissions.module
// Keep keys stable; labels are user-facing.

export type AdminAction = "view" | "create" | "edit" | "delete" | "export";

export type AdminModule = {
  key: string;
  label: string;
  path: string;
  actions: AdminAction[];
};

export const ADMIN_MODULES: AdminModule[] = [
  // Overview
  { key: "dashboard", label: "Dashboard", path: "/admin/dashboard", actions: ["view"] },
  { key: "reports", label: "Reports", path: "/admin/reports", actions: ["view", "edit", "delete"] },

  // People
  { key: "users", label: "Users", path: "/admin/users", actions: ["view", "create", "edit", "delete", "export"] },
  { key: "students", label: "Students", path: "/admin/students", actions: ["view", "create", "edit", "delete", "export"] },
  { key: "student_reports", label: "Student Analysis", path: "/admin/student-reports", actions: ["view", "export"] },
  { key: "alumni_submissions", label: "Alumni Submissions", path: "/admin/alumni-submissions", actions: ["view", "edit", "delete", "export"] },
  { key: "toppers", label: "Topper Students", path: "/admin/toppers", actions: ["view", "create", "edit", "delete"] },

  // Academics
  { key: "courses", label: "Courses", path: "/admin/courses", actions: ["view", "create", "edit", "delete"] },
  { key: "course_content", label: "Course Content", path: "/admin/course-content", actions: ["view", "create", "edit", "delete"] },
  { key: "batches", label: "Batches & CBT Setup", path: "/admin/batches", actions: ["view", "create", "edit", "delete"] },
  { key: "live_classes", label: "Live Classes", path: "/admin/live-classes", actions: ["view", "create", "edit", "delete"] },
  { key: "test_platform", label: "Test Platform", path: "/admin/tests-hub", actions: ["view", "create", "edit", "delete", "export"] },
  { key: "exams", label: "Exam Management", path: "/admin/exams", actions: ["view", "create", "edit", "delete"] },

  // Commerce
  { key: "books", label: "Books / E-Store", path: "/admin/books", actions: ["view", "create", "edit", "delete"] },
  { key: "orders", label: "E-Store Orders", path: "/admin/orders", actions: ["view", "edit", "export"] },
  { key: "boost", label: "BOOST Registrations", path: "/admin/boost", actions: ["view", "edit", "delete", "export"] },

  // Centres
  { key: "centres", label: "Centres", path: "/admin/centres", actions: ["view", "create", "edit", "delete"] },
  { key: "centre_support", label: "Centre Support", path: "/admin/centre-support", actions: ["view", "edit"] },

  // Content & Media
  { key: "page_banners", label: "Page Banners", path: "/admin/banners", actions: ["view", "create", "edit", "delete"] },
  { key: "advantages", label: "Built-In Advantages", path: "/admin/advantages", actions: ["view", "create", "edit", "delete"] },
  { key: "gallery", label: "Gallery", path: "/admin/gallery", actions: ["view", "create", "edit", "delete"] },
  { key: "achievement_posters", label: "Achievement Posters", path: "/admin/achievement-posters", actions: ["view", "create", "edit", "delete"] },
  { key: "blogs", label: "Blogs", path: "/admin/blogs", actions: ["view", "create", "edit", "delete"] },
  { key: "testimonials", label: "Testimonials", path: "/admin/testimonials", actions: ["view", "create", "edit", "delete"] },
  { key: "stats", label: "Homepage Stats", path: "/admin/stats", actions: ["view", "edit"] },
  { key: "leadership", label: "Leadership", path: "/admin/leadership", actions: ["view", "create", "edit", "delete"] },

  // Leads & Campaigns
  { key: "enquiries", label: "Enquiries", path: "/admin/enquiries", actions: ["view", "edit", "delete", "export"] },
  { key: "course_enquiries", label: "Course Enquiries", path: "/admin/course-enquiries", actions: ["view", "edit", "delete", "export"] },
  { key: "landing_page", label: "Campaign Landing", path: "/admin/landing-page", actions: ["view", "edit"] },
  { key: "landing_leads", label: "Campaign Leads", path: "/admin/landing-leads", actions: ["view", "edit", "delete", "export"] },

  // Site Pages
  { key: "site_pages", label: "Site Pages", path: "/admin/site-pages", actions: ["view", "edit"] },
];

export const ADMIN_ACTION_LABEL: Record<AdminAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  export: "Export",
};
