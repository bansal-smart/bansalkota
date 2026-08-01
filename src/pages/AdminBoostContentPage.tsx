import { FileText } from "lucide-react";
import BoostContentPanel from "@/components/admin/BoostContentPanel";

const AdminBoostContentPage = () => {
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

      <BoostContentPanel />
    </div>
  );
};

export default AdminBoostContentPage;
