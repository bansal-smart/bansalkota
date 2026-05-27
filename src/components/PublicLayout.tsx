import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X, Phone, MapPin, Mail, ChevronDown } from "lucide-react";
import BansalLogo from "@/components/bansal/BansalLogo";
import BansalButton from "@/components/bansal/BansalButton";
import { useAppStore } from "@/store/useAppStore";

type NavItem =
  | { label: string; path: string }
  | { label: string; path: string; children: { label: string; path: string }[] };

const aboutChildren = [
  { label: "About Bansal Classes", path: "/about" },
  { label: "About VK Bansal Sir", path: "/about/vk-bansal" },
  { label: "About Sameer Bansal Sir", path: "/about/sameer-bansal" },
  { label: "About Neelam Bansal Ma'am", path: "/about/neelam-bansal" },
  { label: "About Mahima Bansal Ma'am", path: "/about/mahima-bansal" },
];

const navItems: NavItem[] = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about", children: aboutChildren },
  { label: "Courses", path: "/courses" },
  { label: "Test Series", path: "/test-series" },
  { label: "Centers", path: "/centers" },
  { label: "BOOST", path: "/boost" },
  { label: "Career", path: "/career" },
  { label: "Contact", path: "/contact" },
];

const PublicLayout = () => {
  const location = useLocation();
  const { user } = useAppStore();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Utility bar */}
      <div className="hidden md:block bg-bansal-blue text-white text-xs">
        <div className="container mx-auto flex items-center justify-between px-4 py-1.5">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3 text-bansal-orange" /> Admission: +91 9773343246 · +91 8003045222</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/centers" className="hover:text-bansal-orange">Find a Center</Link>
            <Link to="/login" className="hover:text-bansal-orange font-semibold">Student Login</Link>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-md shadow-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center shrink-0">
            <BansalLogo className="h-10 md:h-12 w-auto" />
          </Link>

          <div className="hidden md:flex items-center gap-3 lg:gap-5">
            {navItems.map((item) => {
              const active = item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-semibold transition-colors ${active ? "text-bansal-blue" : "text-bansal-black hover:text-bansal-blue"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Link to="/dashboard">
                <BansalButton variant="primary" className="py-2 text-sm">Dashboard</BansalButton>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <BansalButton variant="outline" className="py-2 text-sm">Login</BansalButton>
                </Link>
                <Link to="/contact">
                  <BansalButton variant="cta" className="py-2 text-sm">Enquire</BansalButton>
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setOpen(true)}
            className="md:hidden p-2 text-bansal-blue"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85vw] bg-bansal-blue text-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <BansalLogo className="h-9 w-auto" variant="white" />
              <button onClick={() => setOpen(false)} aria-label="Close" className="p-1">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-base font-semibold text-white/90 hover:bg-white/10"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3">
              {user ? (
                <Link to="/dashboard" onClick={() => setOpen(false)}>
                  <BansalButton variant="cta" className="w-full">My Dashboard</BansalButton>
                </Link>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)}>
                    <BansalButton variant="ghost-white" className="w-full">Login</BansalButton>
                  </Link>
                  <Link to="/contact" onClick={() => setOpen(false)}>
                    <BansalButton variant="cta" className="w-full">Enquire Now</BansalButton>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-bansal-blue text-white">
        <div className="container mx-auto px-4 py-14">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <BansalLogo className="h-12 w-auto mb-4" variant="white" />
              <p className="font-accent text-sm text-white/80 italic">Ideal for Scholars</p>
              <p className="mt-4 text-sm text-white/70 leading-relaxed">
                India's most trusted JEE &amp; NEET coaching institute. Building foundations for lifelong learning since 1984.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold mb-4 uppercase tracking-wide">Company</h4>
              <div className="space-y-2 text-sm">
                <Link to="/about" className="block text-white/75 hover:text-bansal-orange">About Us</Link>
                <Link to="/career" className="block text-white/75 hover:text-bansal-orange">Careers</Link>
                <Link to="/achievements" className="block text-white/75 hover:text-bansal-orange">Achievements</Link>
                <Link to="/blog" className="block text-white/75 hover:text-bansal-orange">Blogs</Link>
                <Link to="/contact" className="block text-white/75 hover:text-bansal-orange">Contact</Link>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold mb-4 uppercase tracking-wide">Quick Links</h4>
              <div className="space-y-2 text-sm">
                <Link to="/boost" className="block text-white/75 hover:text-bansal-orange">BOOST Scholarship</Link>
                <Link to="/courses" className="block text-white/75 hover:text-bansal-orange">Courses</Link>
                <Link to="/centers" className="block text-white/75 hover:text-bansal-orange">Offline Centers</Link>
                <Link to="/privacy" className="block text-white/75 hover:text-bansal-orange">Privacy Policy</Link>
                <Link to="/terms" className="block text-white/75 hover:text-bansal-orange">Terms &amp; Conditions</Link>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold mb-4 uppercase tracking-wide">Reach Us</h4>
              <div className="space-y-3 text-sm text-white/80">
                <div className="flex gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-bansal-orange" />
                  <span>Bansal Tower, A-10, Road No. 1, IPIA, Kota-324005, Rajasthan</span>
                </div>
                <div className="flex gap-2">
                  <Phone className="h-4 w-4 mt-0.5 shrink-0 text-bansal-orange" />
                  <div>
                    <div>Admission: +91 9773343246 · +91 8003045222</div>
                    <div>HR: +91 8375015384</div>
                    <div>BFTP: +91 8003046222</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Mail className="h-4 w-4 mt-0.5 shrink-0 text-bansal-orange" />
                  <span>info@bansal.ac.in</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 text-center text-xs text-white/60">
            © 2025 Bansal Classes Private Limited. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
