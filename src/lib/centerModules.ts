// Centre Dashboard module catalog — keys used by centre_role_permissions.module
// Keep keys stable; labels are user-facing.

export type CenterAction = "view" | "create" | "edit" | "delete" | "export";

export type CenterModule = {
  key: string;
  label: string;
  path: string;
  // Actions that make sense for this module (drives which checkboxes render)
  actions: CenterAction[];
};

export const CENTER_MODULES: CenterModule[] = [
  { key: "overview", label: "Overview", path: "/center", actions: ["view"] },
  { key: "centre_detail", label: "Centre Detail", path: "/center/content", actions: ["view", "edit"] },
  { key: "page_banners", label: "Page Banners", path: "/center/banners", actions: ["view", "create", "edit", "delete"] },
  { key: "centre_banner", label: "Centre Banner", path: "/center/carousel-banners", actions: ["view", "create", "edit", "delete"] },
  { key: "gallery", label: "Gallery", path: "/center/gallery", actions: ["view", "create", "edit", "delete"] },
  { key: "online_courses", label: "Online Courses", path: "/center/online-courses", actions: ["view"] },
  { key: "centre_courses", label: "Centre Courses", path: "/center/centre-courses", actions: ["view", "create", "edit", "delete"] },
  { key: "live_classes", label: "Live Classes", path: "/center/live-classes", actions: ["view", "create", "edit", "delete"] },
  { key: "test_platform", label: "Test Platform", path: "/center/tests", actions: ["view", "create", "edit", "delete", "export"] },
  { key: "test_series", label: "Test Series", path: "/center/test-series", actions: ["view", "create", "edit", "delete"] },
  { key: "website_enquiries", label: "Website Enquiries", path: "/center/enquiries", actions: ["view", "edit", "delete", "export"] },
  { key: "course_enquiries", label: "Course Enquiries", path: "/center/course-enquiries", actions: ["view", "edit", "delete", "export"] },
  { key: "students", label: "My Students", path: "/center/students", actions: ["view", "create", "edit", "delete", "export"] },
  { key: "support", label: "Support", path: "/center/support", actions: ["view", "edit"] },
];

export const ACTION_LABEL: Record<CenterAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  export: "Export",
};
