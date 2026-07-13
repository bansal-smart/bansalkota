import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * /admin/dashboard renders the BOOST registrations dashboard, which is
 * staff-only content. Centre admins have no dashboard-equivalent tab, so
 * send them to Students (the first item in their sidebar) instead.
 */
const CentreAdminDashboardRedirect = ({ children }: { children: React.ReactNode }) => {
  const { isCenterAdmin } = useAuth();

  if (isCenterAdmin) {
    return <Navigate to="/admin/students" replace />;
  }

  return <>{children}</>;
};

export default CentreAdminDashboardRedirect;
