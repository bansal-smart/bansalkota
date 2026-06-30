import { useCallback, useEffect, useState } from "react";
import { Plus, Loader2, Pencil, Trash2, Shield, Users, UserPlus } from "lucide-react";
import { useConfirm } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import AdminRoleModal from "@/components/AdminRoleModal";

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  member_count: number;
};

type AdminRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: "admin" | "super_admin";
  custom_role_id: string | null;
};

const callFn = async (action: string, payload: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.functions.invoke("manage-admin", {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
};

const AdminRolesPage = () => {
  const { isSuper, loading: loadingPerms } = useAdminPermissions();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Create login state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newCustomRoleId, setNewCustomRoleId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: rs }, listRes, { data: assigns }] = await Promise.all([
        (supabase as any)
          .from("admin_roles")
          .select("id, name, description, created_at")
          .order("created_at", { ascending: false }),
        callFn("list"),
        (supabase as any).from("admin_role_assignments").select("user_id, role_id"),
      ]);

      const assignMap = new Map<string, string>(
        (assigns ?? []).map((a: any) => [a.user_id, a.role_id]),
      );
      const counts = new Map<string, number>();
      assignMap.forEach((rid) => counts.set(rid, (counts.get(rid) ?? 0) + 1));

      setRoles(((rs ?? []) as any[]).map((r) => ({ ...r, member_count: counts.get(r.id) ?? 0 })));
      setAdmins(
        ((listRes?.admins ?? []) as any[]).map((a) => ({
          user_id: a.user_id,
          email: a.email,
          full_name: a.full_name,
          role: a.role,
          custom_role_id: assignMap.get(a.user_id) ?? null,
        })),
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const removeRole = async (id: string) => {
    if (!confirm("Delete this role? Admins assigned to it will revert to full admin access.")) return;
    const { error } = await (supabase as any).from("admin_roles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Role deleted");
    load();
  };

  const assignToAdmin = async (userId: string, roleId: string | null) => {
    try {
      await callFn("assign_custom_role", { user_id: userId, role_id: roleId });
      toast.success("Role assigned");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const createLogin = async () => {
    if (!newEmail.trim() || !newPassword || !newName.trim()) return toast.error("Name, email and password required");
    if (newPassword.length < 8) return toast.error("Password must be at least 8 characters");
    if (!newCustomRoleId) return toast.error("Pick a role to assign");
    setCreating(true);
    try {
      await callFn("create", {
        full_name: newName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim() || null,
        password: newPassword,
        custom_role_id: newCustomRoleId,
      });
      toast.success(`Login created. Share credentials with ${newEmail}.`);
      setNewName(""); setNewEmail(""); setNewPhone(""); setNewPassword(""); setNewCustomRoleId("");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create login");
    } finally {
      setCreating(false);
    }
  };

  if (loadingPerms) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!isSuper) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold text-foreground">Role Management</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Only Super Admins can manage roles and permissions.
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
            Create custom roles for your admin team and choose which Super Admin Dashboard tabs and actions they can use.
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
      </div>

      {/* Create login for a custom role */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-bold text-foreground inline-flex items-center gap-1.5">
            <UserPlus className="h-4 w-4 text-primary" /> Create login for a role
          </p>
          <p className="text-[11px] text-muted-foreground">
            Add a new admin login and assign one of your custom roles. They will only see the tabs/actions you allowed.
          </p>
        </div>
        <div className="p-4 space-y-2">
          <div className="grid gap-2 md:grid-cols-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <select value={newCustomRoleId} onChange={(e) => setNewCustomRoleId(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="">— Assign a custom role —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="login email" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="phone (optional)" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="text" placeholder="Initial password (≥ 8 chars)" className="md:col-span-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" />
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
            <p className="text-[11px] text-muted-foreground">Create a role first, then add admin logins for it.</p>
          )}
        </div>
      </div>

      {/* Assign roles to existing admins */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-bold text-foreground">Assign roles to admins</p>
          <p className="text-[11px] text-muted-foreground">
            Pick a custom role for each admin. Super Admins always have full access.
          </p>
        </div>
        {admins.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No admins yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {admins.map((a) => {
              const isSuperRow = a.role === "super_admin";
              return (
                <li key={a.user_id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">
                      {a.full_name || a.email || a.user_id.slice(0, 8)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.email} · {isSuperRow ? "Super Admin" : "Admin"}
                    </p>
                  </div>
                  <select
                    value={a.custom_role_id ?? ""}
                    disabled={isSuperRow}
                    onChange={(e) => assignToAdmin(a.user_id, e.target.value || null)}
                    className="rounded-md border border-border bg-background px-3 py-1.5 text-sm disabled:opacity-50"
                    title={isSuperRow ? "Super Admins always have full access" : ""}
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
        <AdminRoleModal
          roleId={editingId}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
    </div>
  );
};

export default AdminRolesPage;
