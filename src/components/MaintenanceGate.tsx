import { useLocation } from "react-router-dom";
import { Wrench } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

/**
 * Site-wide maintenance gate. When `platform_settings.maintenance_mode = true`,
 * everyone except admins/super-admins sees a maintenance screen. Admin login
 * and admin routes stay reachable so staff can disable the flag.
 */
const MaintenanceGate = ({ children }: { children: React.ReactNode }) => {
  const { data } = usePlatformSettings();
  const { isStaff } = useAuth();
  const { pathname } = useLocation();

  const isAdminPath = pathname.startsWith("/admin");

  if (!data?.maintenance_mode || isStaff || isAdminPath) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Wrench className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-black text-foreground">
          We'll be back shortly
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.site_name || "Bansal Classes"} is undergoing scheduled
          maintenance. Please check back in a little while.
        </p>
      </div>
    </div>
  );
};

export default MaintenanceGate;
