import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ClipboardCheck,
  Plus,
  LayoutDashboard,
  ListChecks,
  CalendarClock,
  Trophy,
  Library,
  FileBarChart,
  Upload,
  AlertTriangle,
} from "lucide-react";
import AdminTestsHubPage from "./AdminTestsHubPage";
import AdminTestsPage from "./AdminTestsPage";
import AdminTestSeriesPage from "./AdminTestSeriesPage";
import AdminQuestionBankPage from "./AdminQuestionBankPage";
import AdminTestAttemptsPage from "./AdminTestAttemptsPage";
import AdminImportBatchesPage from "./AdminImportBatchesPage";
import AdminQuestionReportsPage from "./AdminQuestionReportsPage";
import UpcomingTestsTab from "@/components/admin/UpcomingTestsTab";

type TabKey =
  | "overview"
  | "all"
  | "upcoming"
  | "series"
  | "bank"
  | "attempts"
  | "imports"
  | "reports";

const TABS: { key: TabKey; label: string; icon: typeof ClipboardCheck }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "all", label: "All Tests", icon: ListChecks },
  { key: "upcoming", label: "Upcoming", icon: CalendarClock },
  { key: "series", label: "Test Series", icon: Trophy },
  { key: "bank", label: "Question Bank", icon: Library },
  { key: "attempts", label: "Attempts", icon: FileBarChart },
  { key: "imports", label: "Imports", icon: Upload },
  { key: "reports", label: "Question Reports", icon: AlertTriangle },
];


const isTabKey = (s: string | null): s is TabKey =>
  !!s && TABS.some((t) => t.key === s);

const AdminTestPlatformHub = () => {
  const [params, setParams] = useSearchParams();
  const initial = isTabKey(params.get("tab")) ? (params.get("tab") as TabKey) : "overview";
  const [tab, setTab] = useState<TabKey>(initial);

  useEffect(() => {
    const t = params.get("tab");
    if (isTabKey(t) && t !== tab) setTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const switchTab = (next: TabKey) => {
    setTab(next);
    const p = new URLSearchParams(params);
    if (next === "overview") p.delete("tab");
    else p.set("tab", next);
    setParams(p, { replace: true });
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)]">
      {/* Hub header */}
      <div className="p-4 lg:p-6 pb-0">
        <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-5 text-white flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/15 p-2.5">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black font-display">Test Platform</h1>
              <p className="text-white/90 text-xs mt-0.5">
                Create, edit, schedule and analyse every test in one place.
              </p>
            </div>
          </div>
          <Link
            to="/admin/tests/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-primary hover:bg-white/90"
          >
            <Plus className="h-4 w-4" /> New test
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-30 bg-background border-b border-border mt-4">
        <div className="px-4 lg:px-6 flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => switchTab(t.key)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab panel */}
      <div className="flex-1 min-h-0">
        {tab === "overview" && <AdminTestsHubPage />}
        {tab === "all" && <AdminTestsPage />}
        {tab === "upcoming" && <UpcomingTestsTab />}
        {tab === "series" && <AdminTestSeriesPage />}
        {tab === "bank" && (
          <div className="p-4 lg:p-6">
            <AdminQuestionBankPage />
          </div>
        )}
        {tab === "attempts" && <AdminTestAttemptsPage />}
        {tab === "imports" && <AdminImportBatchesPage />}
        {tab === "reports" && <AdminQuestionReportsPage />}
      </div>
    </div>
  );
};

export default AdminTestPlatformHub;
