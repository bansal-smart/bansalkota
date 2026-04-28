import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/**
 * Guards student-only routes (e.g. /dashboard, /profile, /my-courses).
 *
 * Behaviour:
 * - Not signed in → redirect to /login (preserving the original destination).
 * - Signed in but staff/admin → friendly /access-denied page (staff portal user
 *   shouldn't see the student UI).
 * - Signed in as a student → render the route.
 *
 * The role check uses {@link useAuth#refreshRole}, which calls the server's
 * `has_role` security-definer function. This means the answer is verified by
 * the database, not just trusted from local state, so manually changing URLs
 * cannot bypass it.
 */
const ProtectedStudentRoute = () => {
  const { session, isStaff, roleReady, loading, refreshRole } = useAuth();
  const location = useLocation();
  const [serverChecked, setServerChecked] = useState(false);
  const [serverIsStaff, setServerIsStaff] = useState(false);

  // Re-verify the role server-side every time we land on a protected student
  // route, so a tampered local state can't grant access.
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
  }, [session, location.pathname, refreshRole]);

  if (loading || !roleReady || !serverChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Staff/admin do not belong in the student portal — show a friendly page.
  if (isStaff || serverIsStaff) {
    return (
      <Navigate
        to="/access-denied"
        state={{ reason: "staff-tried-student", from: location.pathname }}
        replace
      />
    );
  }

  return <Outlet />;
};

export default ProtectedStudentRoute;
