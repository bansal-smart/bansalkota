import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/**
 * Guards the centre admin portal (/center/*).
 *
 * - Not signed in → redirect to /login.
 * - Signed in but not a centre admin (or super admin) → bounce to their portal.
 * - Otherwise render the route.
 */
const ProtectedCenterRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, role, isCenterAdmin, isSuperAdmin, isAdmin, roleReady, loading } = useAuth();
  const location = useLocation();

  if (loading || (session && !roleReady)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Allow centre admins. Super-admins and admins can preview too.
  if (!isCenterAdmin && !isSuperAdmin && !isAdmin) {
    const home =
      role === "teacher"
        ? "/teacher/dashboard"
        : role === "mentor"
          ? "/mentor/dashboard"
          : "/dashboard";
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
};

export default ProtectedCenterRoute;
