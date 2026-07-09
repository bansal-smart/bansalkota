import { useNavigate } from "react-router-dom";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import CenterStaffModal from "@/components/CenterStaffModal";

// Lets a real centre_admin (not admin/super_admin) manage their own centre's
// staff — the modal-based flow at /admin/centres is admin/super_admin-only
// (they pick which centre to manage from a list); a centre_admin only ever
// has one centre, so this page just opens that same modal directly, with
// its close button navigating back to the dashboard instead of unmounting
// to reveal a page underneath.
const AdminCentreStaffPage = () => {
  const navigate = useNavigate();
  const { primaryCenterId, primaryCenter, loading } = useCenterAdmin();

  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!primaryCenterId) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  const centerName = `${primaryCenter?.city ?? ""}${
    primaryCenter?.area && primaryCenter.area !== primaryCenter.city ? " — " + primaryCenter.area : ""
  }`;

  return (
    <CenterStaffModal
      centerId={primaryCenterId}
      centerName={centerName}
      onClose={() => navigate("/admin/dashboard")}
    />
  );
};

export default AdminCentreStaffPage;
