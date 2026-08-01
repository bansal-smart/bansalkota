import { lazy } from "react";
import { useAuth } from "@/context/AuthContext";

const AdminCentreNotificationsPage = lazy(() => import("@/pages/AdminCentreNotificationsPage"));
const CentreNotificationsPage = lazy(() => import("@/pages/CentreNotificationsPage"));

/**
 * /admin/centre-notifications is shared by both roles but renders a
 * different page: super_admin gets the compose/manage UI, centre_admin gets
 * the read-only feed. One-way by design — RLS backs this up server-side
 * (centre_staff has SELECT only on centre_notifications).
 */
const CentreNotificationsRoute = () => {
  const { isCenterAdmin } = useAuth();
  return isCenterAdmin ? <CentreNotificationsPage /> : <AdminCentreNotificationsPage />;
};

export default CentreNotificationsRoute;
