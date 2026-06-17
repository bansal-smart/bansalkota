import { useEffect, useState } from "react";
import { X, UserPlus, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  centerId: string;
  centerName: string;
  onClose: () => void;
};

type StaffRow = {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
  full_name?: string;
};

const CenterStaffModal = ({ centerId, centerName, onClose }: Props) => {
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"existing" | "create">("create");

  // existing-user form
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"manager" | "owner">("manager");
  const [adding, setAdding] = useState(false);

  // create-login form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  // password reset
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: staff } = await (supabase as any)
      .from("center_staff")
      .select("id, user_id, role, created_at")
      .eq("center_id", centerId);
    const userIds = (staff ?? []).map((s: any) => s.user_id);
    let enriched: StaffRow[] = staff ?? [];
    if (userIds.length) {
      const { data: profs } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const map = new Map((profs ?? []).map((p: any) => [p.user_id, p.full_name]));
      enriched = (staff ?? []).map((s: any) => ({ ...s, full_name: map.get(s.user_id) }));
    }
    setRows(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, [centerId]);

  const addExisting = async () => {
    if (!email.trim()) return toast.error("Email required");
    setAdding(true);
    const { data: rpcData, error: rpcErr } = await (supabase as any).rpc("lookup_user_id_by_email", { _email: email.trim() });
    let userId: string | null = rpcData ?? null;
    if (rpcErr || !userId) {
      setAdding(false);
      return toast.error("No user with that email. Use 'Create new login' instead.");
    }
    const { error } = await (supabase as any).from("center_staff").insert({
      center_id: centerId,
      user_id: userId,
      role,
    });
    setAdding(false);
    if (error) return toast.error(error.message);
    toast.success("Staff added — they can now sign in.");
    setEmail("");
    load();
  };

  const createLogin = async () => {
    if (!newEmail.trim() || !newPassword) return toast.error("Email and password required");
    if (newPassword.length < 8) return toast.error("Password must be at least 8 characters");
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("admin-create-center-user", {
      body: {
        action: "create",
        email: newEmail.trim(),
        password: newPassword,
        full_name: newName.trim(),
        center_id: centerId,
        role,
      },
    });
    setCreating(false);
    if (error || (data as any)?.error) {
      return toast.error(((data as any)?.error ?? error?.message) || "Could not create login");
    }
    toast.success(`Login created. Share these credentials with ${newEmail}.`);
    setNewEmail(""); setNewPassword(""); setNewName("");
    load();
  };

  const resetUserPassword = async () => {
    if (!resetEmail.trim() || !resetPassword) return toast.error("Email and new password required");
    if (resetPassword.length < 8) return toast.error("Password must be at least 8 characters");
    setResetting(true);
    const { data, error } = await supabase.functions.invoke("admin-create-center-user", {
      body: { action: "reset_password", email: resetEmail.trim(), password: resetPassword },
    });
    setResetting(false);
    if (error || (data as any)?.error) {
      return toast.error(((data as any)?.error ?? error?.message) || "Could not reset password");
    }
    toast.success(`Password reset for ${resetEmail}.`);
    setResetEmail(""); setResetPassword("");
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this staff member?")) return;
    const { error } = await (supabase as any).from("center_staff").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-card p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Centre Login & Staff</h3>
            <p className="text-xs text-muted-foreground">{centerName}</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        {/* Mode toggle */}
        <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
          <button onClick={() => setMode("create")} className={`px-3 py-1 rounded ${mode === "create" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Create new login</button>
          <button onClick={() => setMode("existing")} className={`px-3 py-1 rounded ${mode === "existing" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Attach existing user</button>
        </div>

        {mode === "create" ? (
          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs font-bold text-foreground inline-flex items-center gap-1">
              <UserPlus className="h-3 w-3" /> Create a new login for this centre
            </p>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name (optional)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="login email" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <select value={role} onChange={(e) => setRole(e.target.value as any)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="text" placeholder="Initial password (≥ 8 chars)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" />
            <button onClick={createLogin} disabled={creating} className="w-full rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground inline-flex items-center justify-center gap-1">
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />} Create login & attach
            </button>
            <p className="text-[10px] text-muted-foreground">Email is auto-confirmed. Share the email + password with the centre. They can change it after signing in.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs font-bold text-foreground inline-flex items-center gap-1">
              <UserPlus className="h-3 w-3" /> Attach an existing user
            </p>
            <div className="flex gap-2">
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@email.com" className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
              <select value={role} onChange={(e) => setRole(e.target.value as any)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
              </select>
              <button onClick={addExisting} disabled={adding} className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
                {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">User must already exist. They will get the "center_admin" role automatically.</p>
          </div>
        )}

        {/* Password reset */}
        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-xs font-bold text-foreground">Reset a centre login password</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="centre user email" className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <input value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} type="text" placeholder="new password (≥ 8)" className="rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" />
          </div>
          <button onClick={resetUserPassword} disabled={resetting} className="w-full rounded-md border border-border px-3 py-2 text-xs font-bold inline-flex items-center justify-center gap-1">
            {resetting ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Reset password
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground">Current staff</p>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff assigned yet.</p>
          ) : rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
              <div>
                <p className="text-sm font-bold text-foreground">{r.full_name || r.user_id.slice(0, 8)}</p>
                <p className="text-[10px] text-muted-foreground">{r.role} · added {new Date(r.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => remove(r.id)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CenterStaffModal;
