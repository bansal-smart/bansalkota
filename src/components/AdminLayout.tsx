import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Flame, CircleDot, Briefcase, Inbox, FileText, Flag } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import { memo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "Educator Applications", icon: Briefcase, path: "/admin/educator-applications" },
  { label: "Enquiries", icon: Inbox, path: "/admin/enquiries" },
  { label: "Course Content", icon: FileText, path: "/admin/course-content" },
  { label: "Reports", icon: Flag, path: "/admin/reports" },
];

type SidebarProps = {
  email: string;
  initials: string;
  onLogout: () => void;
};

// Isolated, memoized sidebar — re-renders only when props or pathname change.
const AdminSidebar = memo(({ email, initials, onLogout }: SidebarProps) => {
  const { pathname } = useLocation();

  return (
    <aside
      className="hidden lg:flex w-[240px] flex-col sticky top-0 h-screen overflow-y-auto"
      style={{ backgroundColor: "hsl(222, 47%, 11%)" }}
    >
      <div className="p-4">
        <Link to="/admin/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Flame className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-black font-display text-white">ARKE</span>
        </Link>
        <div className="mt-3 rounded-md bg-primary/20 px-2 py-1 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Staff Panel</span>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white/90"}`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{email || "Staff"}</p>
            <p className="text-[10px] text-white/50">Staff Member</p>
          </div>
        </div>
        <LogoutButton
          onConfirm={onLogout}
          className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
        />
      </div>
    </aside>
  );
});
AdminSidebar.displayName = "AdminSidebar";

const AdminHeader = memo(({ initials, onLogout }: { initials: string; onLogout: () => void }) => (
  <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:px-6">
    <div className="flex items-center gap-3">
      <h1 className="text-sm font-bold text-foreground">ARKE Staff Dashboard</h1>
    </div>
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-1.5 text-xs text-secondary">
        <CircleDot className="h-3 w-3" />
        <span className="font-medium">Connected</span>
      </div>
      <LogoutButton
        onConfirm={onLogout}
        variant="compact"
        className="lg:hidden flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted"
      />
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {initials}
      </div>
    </div>
  </header>
));
AdminHeader.displayName = "AdminHeader";

const AdminLayout = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleLogout = useCallback(async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/admin/login", { replace: true });
  }, [signOut, navigate]);

  const email = user?.email ?? "";
  const initials = (email || "S").slice(0, 1).toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar email={email} initials={initials} onLogout={handleLogout} />

      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader initials={initials} onLogout={handleLogout} />

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
