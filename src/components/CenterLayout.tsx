import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Flame,
  Image as ImageIcon,
  BookOpen,
  Video,
  Inbox,
  ClipboardList,
  Users,
  LifeBuoy,
  CircleDot,
  Building2,
} from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import NotificationBell from "@/components/NotificationBell";
import { memo, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAppStore } from "@/store/useAppStore";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { toast } from "sonner";

const nav = [
  { label: "Overview", icon: LayoutDashboard, path: "/center" },
  { label: "Centre Content", icon: Building2, path: "/center/content" },
  { label: "Page Banners", icon: ImageIcon, path: "/center/banners" },
  { label: "Gallery", icon: ImageIcon, path: "/center/gallery" },
  { label: "Online Courses", icon: Video, path: "/center/online-courses" },
  { label: "Offline Courses", icon: BookOpen, path: "/center/courses" },
  { label: "Website Enquiries", icon: Inbox, path: "/center/enquiries" },
  { label: "Course Enquiries", icon: ClipboardList, path: "/center/course-enquiries" },
  { label: "My Students", icon: Users, path: "/center/students" },
  { label: "Support", icon: LifeBuoy, path: "/center/support" },
];

const CenterSidebar = memo(({ email, initials, avatarUrl, centerLabel, onLogout }: {
  email: string;
  initials: string;
  avatarUrl?: string;
  centerLabel: string;
  onLogout: () => void;
}) => {
  const { pathname } = useLocation();
  return (
    <aside
      className="hidden lg:flex w-[240px] flex-col sticky top-0 h-screen overflow-y-auto scrollbar-hide"
      style={{ backgroundColor: "hsl(222, 47%, 11%)" }}
    >
      <div className="p-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Flame className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-black font-display text-white">Bansal Classes</span>
        </Link>
        <div className="mt-3 rounded-md bg-primary/20 px-2 py-1 text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Centre Panel
          </span>
        </div>
        <p className="mt-2 text-[11px] text-white/60 truncate" title={centerLabel}>
          {centerLabel}
        </p>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/40">Modules</p>
        {nav.map((item) => {
          const active = item.path === "/center" ? pathname === "/center" : pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white/90"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground overflow-hidden">
            {avatarUrl ? <img src={avatarUrl} alt={initials} className="h-full w-full object-cover" /> : initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{email || "Centre Admin"}</p>
            <p className="text-[10px] text-white/50">Centre Admin</p>
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
CenterSidebar.displayName = "CenterSidebar";

const CenterLayout = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { primaryCenter, loading } = useCenterAdmin();

  const handleLogout = useCallback(async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  }, [signOut, navigate]);

  const email = user?.email ?? "";
  const initials = useMemo(() => (email || "C").slice(0, 1).toUpperCase(), [email]);
  const storeUser = useAppStore((s) => s.user);
  const avatarUrl = storeUser?.avatar_url;

  const centerLabel = primaryCenter
    ? `${primaryCenter.city}${primaryCenter.area && primaryCenter.area !== primaryCenter.city ? " — " + primaryCenter.area : ""}`
    : loading ? "Loading…" : "No centre assigned";

  return (
    <div className="flex min-h-screen bg-background">
      <CenterSidebar email={email} initials={initials} avatarUrl={avatarUrl} centerLabel={centerLabel} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-foreground">Centre Dashboard — {centerLabel}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-secondary">
              <CircleDot className="h-3 w-3" />
              <span className="font-medium">Connected</span>
            </div>
            <NotificationBell />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground overflow-hidden">
              {avatarUrl ? <img src={avatarUrl} alt={initials} className="h-full w-full object-cover" /> : initials}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto scrollbar-hide">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default CenterLayout;
