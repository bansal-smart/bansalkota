import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, BookOpen, Video, ClipboardCheck, BarChart3, User } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import { memo, useCallback } from "react";
import LiveBadge from "@/components/LiveBadge";
import NotificationBell from "@/components/NotificationBell";
import BansalLogo from "@/components/bansal/BansalLogo";
import ProfileCompletionDialog from "@/components/ProfileCompletionDialog";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";

type StudentNavItem = {
  label: string;
  icon: React.ElementType;
  path: string;
  live?: boolean;
};

const navItems: StudentNavItem[] = [
  { label: "Home", icon: Home, path: "/dashboard" },
  { label: "My Course", icon: BookOpen, path: "/my-courses" },
  { label: "My Live Class", icon: Video, path: "/my-live-classes", live: true },
  { label: "My Live Test", icon: ClipboardCheck, path: "/my-tests" },
  { label: "My Progress", icon: BarChart3, path: "/analytics" },
  { label: "My Profile", icon: User, path: "/profile" },
];

type SidebarProps = {
  fullName: string;
  avatarUrl?: string;
  initials: string;
  onLogout: () => void;
};

const StudentSidebar = memo(({ fullName, avatarUrl, initials, onLogout }: SidebarProps) => {
  const { pathname } = useLocation();

  const renderItem = (item: StudentNavItem) => {
    const active = pathname === item.path;
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"}`}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.live && <LiveBadge />}
      </Link>
    );
  };

  return (
    <aside className="hidden lg:flex w-[240px] flex-col border-r border-border bg-card sticky top-0 h-screen overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="px-4 py-5 border-b border-border">
        <Link to="/" className="flex items-center justify-center">
          <BansalLogo className="h-12 w-auto" />
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(renderItem)}
      </nav>

      <div className="border-t border-border p-4">
        <Link to="/profile" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary overflow-hidden">
            {avatarUrl ? <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" /> : initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{fullName || "Student"}</p>
            <p className="text-[10px] text-muted-foreground">View Profile</p>
          </div>
        </Link>
        <LogoutButton onConfirm={onLogout} />
      </div>
    </aside>
  );
});
StudentSidebar.displayName = "StudentSidebar";

const StudentMobileNav = memo(() => {
  const { pathname } = useLocation();
  const items = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: BookOpen, label: "Course", path: "/my-courses" },
    { icon: Video, label: "Live", path: "/my-live-classes" },
    { icon: ClipboardCheck, label: "Tests", path: "/my-tests" },
    { icon: User, label: "Profile", path: "/profile" },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card py-2 lg:hidden">
      {items.map((item) => {
        const active = pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 ${active ? "text-primary" : "text-muted-foreground"}`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
});
StudentMobileNav.displayName = "StudentMobileNav";

const StudentHeader = memo(({ fullName, avatarUrl }: { fullName: string; avatarUrl?: string }) => (
  <header className="sticky top-0 z-40 flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3 lg:px-6">
    <div className="flex items-center gap-3">
      <div className="lg:hidden">
        <BansalLogo className="h-9 w-auto" />
      </div>
    </div>
    <div className="flex items-center gap-3">
      <NotificationBell />
      <Link to="/profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
        ) : (
          fullName?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "U"
        )}
      </Link>
    </div>
  </header>
));
StudentHeader.displayName = "StudentHeader";

const StudentLayout = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const { signOut } = useAuth();
  useNotifications();

  const handleLogout = useCallback(async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/login");
  }, [signOut, navigate]);

  const fullName = user?.full_name || "";
  const initials = fullName
    ? fullName.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("")
    : "U";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <StudentSidebar
        fullName={fullName}
        avatarUrl={user?.avatar_url}
        initials={initials}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <StudentHeader fullName={fullName} avatarUrl={user?.avatar_url} />

        <main className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Outlet />
        </main>
      </div>

      <StudentMobileNav />
      <ProfileCompletionDialog />
    </div>
  );
};

export default StudentLayout;
