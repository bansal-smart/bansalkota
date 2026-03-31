import { Outlet, Link, useLocation } from "react-router-dom";
import { Home, BookOpen, Video, ClipboardCheck, MessageCircle, Users, BarChart3, Settings, Bell, Search, LogOut, Flame, PlusCircle } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const navItems = [
  { label: "Dashboard", icon: Home, path: "/teacher/dashboard" },
  { label: "My Courses", icon: BookOpen, path: "/teacher/courses" },
  { label: "Live Classes", icon: Video, path: "/teacher/live-classes" },
  { label: "Create Test", icon: ClipboardCheck, path: "/teacher/tests/create" },
  { label: "Doubt Queue", icon: MessageCircle, path: "/teacher/doubts", badge: 38 },
  { label: "My Students", icon: Users, path: "/teacher/students" },
  { label: "Analytics", icon: BarChart3, path: "/teacher/analytics" },
  { label: "Settings", icon: Settings, path: "/teacher/settings" },
];

const TeacherLayout = () => {
  const location = useLocation();
  const { user } = useAppStore();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[220px] flex-col border-r border-border bg-card sticky top-0 h-screen overflow-y-auto">
        <div className="p-4">
          <Link to="/teacher/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Flame className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-black font-display text-foreground">ARAMBH</span>
          </Link>
          <div className="mt-3 rounded-md bg-primary/10 px-2 py-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Teacher Portal</span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Navigation</p>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"}`}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">VT</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">Vikram Thapar</p>
              <p className="text-[10px] text-muted-foreground">Physics Educator</p>
            </div>
          </div>
          <button className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="lg:hidden flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Flame className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Search courses, students..." className="w-64 rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/teacher/courses/create" className="hidden sm:flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
              <PlusCircle className="h-3.5 w-3.5" /> Create Course
            </Link>
            <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-background transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">5</span>
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">VT</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
