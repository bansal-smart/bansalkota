import { Outlet, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, BookOpen, Video, ClipboardCheck, CreditCard, Bell, Shield, Settings, Search, LogOut, Flame, CircleDot, Briefcase } from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "Users", icon: Users, path: "/admin/users" },
  { label: "Courses", icon: BookOpen, path: "/admin/courses" },
  { label: "Live Classes", icon: Video, path: "/admin/live-classes" },
  { label: "Tests", icon: ClipboardCheck, path: "/admin/tests" },
  { label: "Educator Applications", icon: Briefcase, path: "/admin/educator-applications" },
  { label: "Payments", icon: CreditCard, path: "/admin/payments" },
  { label: "Notifications", icon: Bell, path: "/admin/notifications" },
  { label: "Moderation", icon: Shield, path: "/admin/moderation" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

const AdminLayout = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Dark Navy Sidebar */}
      <aside className="hidden lg:flex w-[220px] flex-col sticky top-0 h-screen overflow-y-auto" style={{ backgroundColor: "hsl(222, 47%, 11%)" }}>
        <div className="p-4">
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Flame className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-black font-display text-white">ARAMBH</span>
          </Link>
          <div className="mt-3 rounded-md bg-destructive/20 px-2 py-1 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-destructive">Admin Panel</span>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white/90"}`}
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">A</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">Admin User</p>
              <p className="text-[10px] text-white/50">Super Admin</p>
            </div>
          </div>
          <button className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/50 hover:bg-white/5 hover:text-white transition-colors">
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-foreground">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-secondary">
              <CircleDot className="h-3 w-3" />
              <span className="font-medium">All systems operational</span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">A</div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
