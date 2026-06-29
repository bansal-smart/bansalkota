import { useEffect, useState } from "react";
import { Plus, Loader2, Pencil, Trash2, Shield, Users, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { useCenterPermissions } from "@/hooks/useCenterPermissions";
import CenterRoleModal from "@/components/CenterRoleModal";

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  member_count: number;
};

type StaffRow = {
  id: string;
  user_id: string;
  role: string;
  custom_role_id: string | null;
  full_name: string | null;
};

const CenterRolesPage = () => {
  const { primaryCenterId, loading: loadingCenter } = useCenterAdmin();
  const { isAdmin, loading: loadingPerms } = useCenterPermissions();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Create login state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newCustomRoleId, setNewCustomRoleId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const createLogin = async () => {
    if (!primaryCenterId) return;
    if (!newEmail.trim() || !newPassword) return toast.error("Email and password required");
    if (newPassword.length < 8) return toast.error("Password must be at least 8 characters");
    if (!newCustomRoleId) return toast.error("Pick a role to assign");
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("admin-create-center-user", {
      body: {
        action: "create",
        email: newEmail.trim(),
        password: newPassword,
        full_name: newName.trim(),
        centre_id: primaryCenterId,
        role: "manager",
        custom_role_id: newCustomRoleId,
      },
    });
    setCreating(false);
    if (error || (data as any)?.error) {
      return toast.error(((data as any)?.error ?? error?.message) || "Could not create login");
    }
    toast.success(`Login created. Share credentials with ${newEmail}.`);
    setNewName(""); setNewEmail(""); setNewPassword(""); setNewCustomRoleId("");
    load();
  };

  const load = async () => {
    if (!primaryCenterId) return;
    setLoading(true);
    const [{ data: rs }, { data: ss }] = await Promise.all([
      (supabase as any)
        .from("centre_roles")
        .select("id, name, description, created_at")
        .eq("centre_id", primaryCenterId)
        .order("created_at", { ascending: false }),
      (supabase as any)
        .from("centre_staff")
        .select("id, user_id, role, custom_role_id")
        .eq("centre_id", primaryCenterId),
    ]);
    const userIds = (ss ?? []).map((s: any) => s.user_id);
    let names = new Map<string, string>();
    if (userIds.length) {
      const { data: profs } = await (supabase as any)
        .from("profiles").select("user_id, full_name").in("user_id", userIds);
      names = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name ?? ""]));
    }
    const enrichedStaff: StaffRow[] = (ss ?? []).map((s: any) => ({
      ...s, full_name: names.get(s.user_id) ?? null,
    }));
    const counts = new Map<string, number>();
    enrichedStaff.forEach((s) => {
      if (s.custom_role_id) counts.set(s.custom_role_id, (counts.get(s.custom_role_id) ?? 0) + 1);
    });
    const enrichedRoles: RoleRow[] = (rs ?? []).map((r: any) => ({
      ...r, member_count: counts.get(r.id) ?? 0,
    }));
    setRoles(enrichedRoles);
    setStaff(enrichedStaff);
    setLoading(false);
  };

  useEffect(() => { load(); }, [primaryCenterId]);

  const removeRole = async (id: string) => {
    if (!confirm("Delete this role? Staff assigned to it will revert to centre-admin defaults.")) return;
    const { error } = await (supabase as any).from("centre_roles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Role deleted");
    load();
  };

  const assignToStaff = async (staffId: string, roleId: string | null) => {
    const { error } = await (supabase as any)
      .from("centre_staff").update({ custom_role_id: roleId }).eq("id", staffId);
    if (error) return toast.error(error.message);
    toast.success("Role assigned");
    load();
  };

  if (loadingCenter || loadingPerms) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!primaryCenterId) {
    return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;
  }
  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold text-foreground">Role Management</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Only the Centre Admin can manage roles and permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black font-display text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Role Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Create custom roles for your centre staff and choose which Centre Dashboard tabs and actions they can use.
          </p>
        </div>
        <button
          onClick={() => { setEditingId(null); setShowModal(true); }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Add Role
        </button>
      </div>

      {/* Roles list */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-bold text-foreground">Custom roles</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : roles.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No custom roles yet. Click <span className="font-semibold">Add Role</span> to create one.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {roles.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-bold text-foreground truncate">{r.name}</p>
                  {r.description && (
                    <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                    <Users className="h-3 w-3" /> {r.member_count} member{r.member_count === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingId(r.id); setShowModal(true); }}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold"
                  >
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={() => removeRole(r.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-destructive/30 text-destructive px-3 py-1.5 text-xs font-semibold"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}


      {/* Create login for a custom role */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-bold text-foreground inline-flex items-center gap-1.5">
            <UserPlus className="h-4 w-4 text-primary" /> Create login for a role
          </p>
          <p className="text-[11px] text-muted-foreground">
            Add a new staff login and assign one of your custom roles. They will only see the tabs/actions you allowed.
          </p>
        </div>
        <div className="p-4 space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name (optional)" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <select value={newCustomRoleId} onChange={(e) => setNewCustomRoleId(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="">— Assign a custom role —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="login email" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="text" placeholder="Initial password (≥ 8 chars)" className="rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" />
          </div>
          <button
            onClick={createLogin}
            disabled={creating || roles.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Create login
          </button>
          {roles.length === 0 && (
            <p className="text-[11px] text-muted-foreground">Create a role first, then add staff logins for it.</p>
          )}
        </div>
      </div>

      {/* Assign roles to staff */}
      <div className="rounded-xl border border-border bg-card">

        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-bold text-foreground">Assign roles to staff</p>
          <p className="text-[11px] text-muted-foreground">
            Pick a custom role for each staff member. Centre Admins always have full access.
          </p>
        </div>
        {staff.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No staff added yet. Ask the super admin to create centre logins.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {staff.map((s) => {
              const isCoarseAdmin = s.role === "admin";
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">
                      {s.full_name || s.user_id.slice(0, 8)}
                    </p>
                    <p className="text-[11px] text-muted-foreground capitalize">
                      {s.role} (Centre Level)
                    </p>
                  </div>
                  <select
                    value={s.custom_role_id ?? ""}
                    disabled={isCoarseAdmin}
                    onChange={(e) => assignToStaff(s.id, e.target.value || null)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
                    title={isCoarseAdmin ? "Centre Admins already have full access" : ""}
                  >
                    <option value="">— No custom role —</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showModal && (
        <CenterRoleModal
          centerId={primaryCenterId}
          roleId={editingId}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  );
};

export default CenterRolesPage;
