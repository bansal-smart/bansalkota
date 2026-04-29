import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/**
 * Guards admin/staff-only routes (everything under /admin/*).
 *
 * Behaviour:
 * - Not signed in → redirect to /admin/login (preserving the original destination).
 * - Signed in as a student → friendly /access-denied page explaining why.
 * - Signed in as staff/admin → render the route.
 *
 * The role check is verified server-side via the `has_role` RPC, so a student
 * cannot grant themselves admin access by editing local state or URLs.
 */
const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, isStaff, roleReady, loading, refreshRole } = useAuth();
  const location = useLocation();
  const [serverChecked, setServerChecked] = useState(false);
  const [serverIsStaff, setServerIsStaff] = useState(false);

  // Verify role server-side once per session — not on every navigation —
  // so moving between admin tabs doesn't unmount the layout/sidebar.
  useEffect(() => {
    let active = true;
    if (!session) {
      setServerChecked(true);
      return;
    }
    setServerChecked(false);
    refreshRole().then((staff) => {
      if (!active) return;
      setServerIsStaff(staff);
      setServerChecked(true);
    });
    return () => {
      active = false;
    };
  }, [session, refreshRole]);

  if (loading || !roleReady || !serverChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Authenticated but not staff → student tried to access /admin
  if (!isStaff && !serverIsStaff) {
    return (
      <Navigate
        to="/access-denied"
        state={{ reason: "student-tried-admin", from: location.pathname }}
        replace
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;
