import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, BookOpen, Video, ClipboardCheck, MessageCircle, Users, Swords, BarChart3, Trophy, User, Settings, ShoppingBag, Bell, Search, LogOut, Flame, BookMarked, GraduationCap } from "lucide-react";
import GoalSelector from "@/components/GoalSelector";
import LiveBadge from "@/components/LiveBadge";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const navItems = [
  { label: "Home", icon: Home, path: "/dashboard" },
  { label: "My Learning", icon: BookOpen, path: "/my-courses" },
  { label: "Browse Courses", icon: GraduationCap, path: "/courses" },
  { label: "Live Classes", icon: Video, path: "/live-classes", live: true },
  { label: "Tests", icon: ClipboardCheck, path: "/tests" },
  { label: "QBank", icon: BookMarked, path: "/qbank" },
  { label: "Doubts", icon: MessageCircle, path: "/doubts", badge: 3 },
];

const exploreItems = [
  { label: "Educators", icon: Users, path: "/educators" },
  { label: "Compete", icon: Swords, path: "/compete" },
  { label: "My Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Leaderboard", icon: Trophy, path: "/leaderboard" },
];

const accountItems = [
  { label: "Profile", icon: User, path: "/profile" },
  { label: "Settings", icon: Settings, path: "/settings" },
  { label: "Store", icon: ShoppingBag, path: "/store" },
];

const StudentLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, currentGoal, setCurrentGoal, notificationCount } = useAppStore();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/login");
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]?.toUpperCase()).join('')
    : 'U';

  const NavLink = ({ item }: { item: { label: string; icon: React.ElementType; path: string; live?: boolean; badge?: number } }) => {
    const active = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"}`}
      >
        <item.icon className="h-4.5 w-4.5 shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.live && <LiveBadge />}
        {item.badge && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[220px] flex-col border-r border-border bg-card sticky top-0 h-screen overflow-y-auto">
        <div className="p-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Flame className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-black font-display text-foreground">ARKE</span>
          </Link>
          <div className="mt-4">
            <GoalSelector value={currentGoal} onChange={setCurrentGoal} />
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Main</p>
          {navItems.map((item) => <NavLink key={item.path} item={item} />)}
          <p className="px-3 pt-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Explore</p>
          {exploreItems.map((item) => <NavLink key={item.path} item={item} />)}
          <p className="px-3 pt-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Account</p>
          {accountItems.map((item) => <NavLink key={item.path} item={item} />)}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{user?.full_name || 'Guest'}</p>
              <Link to="/profile" className="text-[10px] text-primary hover:underline">View Profile</Link>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="lg:hidden flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Flame className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search courses, tests..."
                className="w-64 rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-background transition-colors">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {notificationCount}
                </span>
              )}
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
              {user?.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card py-2 lg:hidden">
        {[
          { icon: Home, label: "Home", path: "/dashboard" },
          { icon: BookOpen, label: "Learning", path: "/my-courses" },
          { icon: BookMarked, label: "QBank", path: "/qbank" },
          { icon: ClipboardCheck, label: "Tests", path: "/tests" },
          { icon: ShoppingBag, label: "Store", path: "/store" },
        ].map((item) => {
          const active = location.pathname === item.path;
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
    </div>
  );
};

export default StudentLayout;
