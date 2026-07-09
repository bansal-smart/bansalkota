// Centre role module catalog — keys used by role_permissions.module for
// scope='centre' roles. Independent of the (Phase-2) centre portal UI: super_admin
// defines centre role permissions against this catalog. Keys MUST stay in sync with
// the seeded presets in supabase migration 20260707021630_centre_role_presets.sql.
// Keep keys stable; labels are user-facing.

export type CenterAction = "view" | "create" | "edit" | "delete" | "export";

export type CenterModule = {
  key: string;
  label: string;
  // Actions that make sense for this module (drives which checkboxes render).
  actions: CenterAction[];
};

export const CENTER_MODULES: CenterModule[] = [
  { key: "overview", label: "Overview", actions: ["view"] },
  { key: "students", label: "Students", actions: ["view", "create", "edit", "delete", "export"] },
  { key: "test_platform", label: "Test Platform", actions: ["view", "create", "edit", "delete", "export"] },
  // Franchise centres cannot CREATE batches (auto-generated) — view + CBT setup (edit) only.
  { key: "batches_cbt", label: "Batches & CBT", actions: ["view", "edit"] },
  { key: "student_analysis", label: "Student Analysis", actions: ["view", "export"] },
  { key: "courses", label: "Courses", actions: ["view", "create", "edit", "delete"] },
  { key: "enquiries", label: "Enquiries", actions: ["view", "edit", "delete", "export"] },
  { key: "centre_support", label: "Centre Support", actions: ["view", "edit"] },
  { key: "gallery", label: "Gallery", actions: ["view", "create", "edit", "delete"] },
  { key: "news_updates", label: "News & Updates", actions: ["view", "create", "edit", "delete"] },
];

export const ACTION_LABEL: Record<CenterAction, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  export: "Export",
};
