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
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"manager" | "owner">("manager");
  const [adding, setAdding] = useState(false);

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

  const addStaff = async () => {
    if (!email.trim()) return toast.error("Email required");
    setAdding(true);
    // Look up user by email via profiles → auth.users join not available; use admin RPC alternative: look up in profiles via auth metadata isn't possible from client. Fall back to: ask user to share user_id, OR do email lookup via Supabase Auth admin function. Cheapest path: look up by email in our enquiries-like table not available. We'll use supabase.auth.admin only available server-side. Instead require the user to already have a profile and look them up via a security-definer RPC — but to keep changes minimal, look up by full_name OR ask user to paste user_id. For now we'll fetch from auth.users via RPC if exists, else fallback to error.
    const { data: rpcData, error: rpcErr } = await (supabase as any).rpc("lookup_user_id_by_email", { _email: email.trim() });
    let userId: string | null = rpcData ?? null;
    if (rpcErr || !userId) {
      setAdding(false);
      return toast.error("Could not find a user with that email. Ask them to sign up first.");
    }
    const { error } = await (supabase as any).from("center_staff").insert({
      center_id: centerId,
      user_id: userId,
      role,
    });
    setAdding(false);
    if (error) return toast.error(error.message);
    toast.success("Staff added — they can now sign in and access the Centre Panel.");
    setEmail("");
    load();
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
      <div className="w-full max-w-xl rounded-2xl bg-card p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Centre Staff</h3>
            <p className="text-xs text-muted-foreground">{centerName}</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-xs font-bold text-foreground inline-flex items-center gap-1"><UserPlus className="h-3 w-3" /> Add staff member</p>
          <div className="flex gap-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@email.com" className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <select value={role} onChange={(e) => setRole(e.target.value as any)} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select>
            <button onClick={addStaff} disabled={adding} className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
              {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">User must already have a Bansal account. Adding them grants the "center_admin" role automatically.</p>
        </div>

        <div className="space-y-2">
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
