import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { AdminAction } from "@/lib/adminModules";

type PermRow = {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
};

type State = {
  loading: boolean;
  isSuper: boolean;          // super_admin OR no custom role assigned => full access
  customRoleName: string | null;
  perms: Record<string, PermRow>;
};

const ACTION_KEY: Record<AdminAction, keyof PermRow> = {
  view: "can_view",
  create: "can_create",
  edit: "can_edit",
  delete: "can_delete",
  export: "can_export",
};

export const useAdminPermissions = () => {
  const { user, roleReady, role, isSuperAdmin } = useAuth();
  const [state, setState] = useState<State>({
    loading: true,
    isSuper: false,
    customRoleName: null,
    perms: {},
  });

  useEffect(() => {
    if (!roleReady) return;
    if (!user) {
      setState({ loading: false, isSuper: false, customRoleName: null, perms: {} });
      return;
    }
    let cancelled = false;
    (async () => {
      // Super admins always have full access.
      if (isSuperAdmin || role === "super_admin") {
        if (!cancelled) setState({ loading: false, isSuper: true, customRoleName: null, perms: {} });
        return;
      }

      const { data: assignment } = await (supabase as any)
        .from("admin_role_assignments")
        .select("role_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const customRoleId: string | null = assignment?.role_id ?? null;

      // No custom role => admin has full access (matches centre pattern).
      if (!customRoleId) {
        if (!cancelled) setState({ loading: false, isSuper: true, customRoleName: null, perms: {} });
        return;
      }

      const [{ data: roleRow }, { data: permRows }] = await Promise.all([
        (supabase as any).from("admin_roles").select("name").eq("id", customRoleId).maybeSingle(),
        (supabase as any).from("admin_role_permissions").select("*").eq("role_id", customRoleId),
      ]);

      const perms: Record<string, PermRow> = {};
      (permRows ?? []).forEach((p: PermRow) => { perms[p.module] = p; });

      if (!cancelled) {
        setState({
          loading: false,
          isSuper: false,
          customRoleName: roleRow?.name ?? null,
          perms,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [user, roleReady, role, isSuperAdmin]);

  const can = (moduleKey: string, action: AdminAction = "view"): boolean => {
    if (state.isSuper) return true;
    const row = state.perms[moduleKey];
    if (!row) return false;
    return !!row[ACTION_KEY[action]];
  };

  return { ...state, can };
};
