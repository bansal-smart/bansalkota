import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import type { CenterAction } from "@/lib/centerModules";

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
  isAdmin: boolean;          // centre admin OR super_admin OR no custom role
  customRoleName: string | null;
  perms: Record<string, PermRow>;
};

const ACTION_KEY: Record<CenterAction, keyof PermRow> = {
  view: "can_view",
  create: "can_create",
  edit: "can_edit",
  delete: "can_delete",
  export: "can_export",
};

export const useCenterPermissions = () => {
  const { user, roleReady, role } = useAuth();
  const [state, setState] = useState<State>({
    loading: true,
    isAdmin: false,
    customRoleName: null,
    perms: {},
  });

  useEffect(() => {
    if (!roleReady) return;
    if (!user) {
      setState({ loading: false, isAdmin: false, customRoleName: null, perms: {} });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: staff } = await (supabase as any)
        .from("centre_staff")
        .select("role, custom_role_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const isSuper = role === "super_admin";
      const coarse = (staff?.role ?? "").toLowerCase();
      const customRoleId: string | null = staff?.custom_role_id ?? null;

      // Treat as full admin if super_admin, or coarse role = admin, or no custom role set
      if (isSuper || coarse === "admin" || !customRoleId) {
        if (!cancelled) {
          setState({ loading: false, isAdmin: true, customRoleName: null, perms: {} });
        }
        return;
      }

      const [{ data: roleRow }, { data: permRows }] = await Promise.all([
        (supabase as any).from("centre_roles").select("name").eq("id", customRoleId).maybeSingle(),
        (supabase as any).from("centre_role_permissions").select("*").eq("role_id", customRoleId),
      ]);

      const perms: Record<string, PermRow> = {};
      (permRows ?? []).forEach((p: PermRow) => {
        perms[p.module] = p;
      });

      if (!cancelled) {
        setState({
          loading: false,
          isAdmin: false,
          customRoleName: roleRow?.name ?? null,
          perms,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [user, roleReady, role]);

  const can = (moduleKey: string, action: CenterAction = "view"): boolean => {
    if (state.isAdmin) return true;
    const row = state.perms[moduleKey];
    if (!row) return false;
    return !!row[ACTION_KEY[action]];
  };

  return { ...state, can };
};
