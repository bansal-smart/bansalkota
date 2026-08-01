import { FileText, ShieldAlert } from "lucide-react";
import BoostContentPanel from "@/components/admin/BoostContentPanel";
import { useAuth } from "@/context/AuthContext";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";

const AdminBoostContentPage = () => {
  const { isSuperAdmin } = useAuth();
  const { isHq } = useCenterAdmin();
  // Only the HQ (Kota) centre admin and super admins manage this page —
  // matches the is_hq_centre_admin() RLS on boost_page_content.
  const canManage = isHq || isSuperAdmin;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-bansal-orange" /> BOOST Page
        </h1>
        <p className="text-sm text-muted-foreground">
          Edit the content of the public /boost scholarship page.
        </p>
      </div>

      {canManage ? (
        <BoostContentPanel />
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 flex items-start gap-3 text-sm text-muted-foreground">
          <ShieldAlert className="h-5 w-5 text-bansal-orange shrink-0" />
          <div>
            <p className="font-semibold text-foreground">Not available for your account</p>
            <p>The BOOST page is managed by the Kota HQ centre admin.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBoostContentPage;
