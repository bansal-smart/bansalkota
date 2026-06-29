import { useEffect, useState } from "react";
import { X, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CENTER_MODULES, ACTION_LABEL, type CenterAction } from "@/lib/centerModules";

type Props = {
  centerId: string;
  roleId?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

type PermMap = Record<string, Record<CenterAction, boolean>>;

const emptyPerms = (): PermMap => {
  const m: PermMap = {};
  CENTER_MODULES.forEach((mod) => {
    m[mod.key] = { view: false, create: false, edit: false, delete: false, export: false };
  });
  return m;
};

const CenterRoleModal = ({ centerId, roleId, onClose, onSaved }: Props) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [perms, setPerms] = useState<PermMap>(emptyPerms());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!roleId);

  useEffect(() => {
    if (!roleId) return;
    (async () => {
      setLoading(true);
      const [{ data: r }, { data: ps }] = await Promise.all([
        (supabase as any).from("centre_roles").select("name, description").eq("id", roleId).maybeSingle(),
        (supabase as any).from("centre_role_permissions").select("*").eq("role_id", roleId),
      ]);
      if (r) {
        setName(r.name ?? "");
        setDescription(r.description ?? "");
      }
      const next = emptyPerms();
      (ps ?? []).forEach((p: any) => {
        next[p.module] = {
          view: !!p.can_view, create: !!p.can_create, edit: !!p.can_edit,
          delete: !!p.can_delete, export: !!p.can_export,
        };
      });
      setPerms(next);
      setLoading(false);
    })();
  }, [roleId]);

  const toggle = (modKey: string, action: CenterAction) => {
    setPerms((prev) => {
      const row = { ...prev[modKey], [action]: !prev[modKey][action] };
      // If turning on any non-view action, auto-enable view as well.
      if (action !== "view" && row[action]) row.view = true;
      return { ...prev, [modKey]: row };
    });
  };

  const toggleAllRow = (modKey: string, on: boolean) => {
    setPerms((prev) => {
      const mod = CENTER_MODULES.find((m) => m.key === modKey)!;
      const next: Record<CenterAction, boolean> = { view: false, create: false, edit: false, delete: false, export: false };
      mod.actions.forEach((a) => { next[a] = on; });
      return { ...prev, [modKey]: next };
    });
  };

  const save = async () => {
    if (!name.trim()) return toast.error("Role name is required");
    setSaving(true);
    try {
      let rid = roleId;
      if (!rid) {
        const { data, error } = await (supabase as any)
          .from("centre_roles")
          .insert({ centre_id: centerId, name: name.trim(), description: description.trim() || null })
          .select("id")
          .single();
        if (error) throw error;
        rid = data.id as string;
      } else {
        const { error } = await (supabase as any)
          .from("centre_roles")
          .update({ name: name.trim(), description: description.trim() || null })
          .eq("id", rid);
        if (error) throw error;
        await (supabase as any).from("centre_role_permissions").delete().eq("role_id", rid);
      }
      const inserts = CENTER_MODULES
        .filter((m) => {
          const p = perms[m.key];
          return p.view || p.create || p.edit || p.delete || p.export;
        })
        .map((m) => ({
          role_id: rid,
          module: m.key,
          can_view: !!perms[m.key].view,
          can_create: !!perms[m.key].create,
          can_edit: !!perms[m.key].edit,
          can_delete: !!perms[m.key].delete,
          can_export: !!perms[m.key].export,
        }));
      if (inserts.length) {
        const { error } = await (supabase as any).from("centre_role_permissions").insert(inserts);
        if (error) throw error;
      }
      toast.success(roleId ? "Role updated" : "Role created");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl rounded-2xl bg-card p-6 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">{roleId ? "Edit Role" : "Add Role"}</h3>
            <p className="text-xs text-muted-foreground">
              Pick which Centre Dashboard tabs this role can access and what they can do.
            </p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-muted-foreground" /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-foreground">Role name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Front Desk"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-foreground">Description (optional)</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this role do?"
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="rounded-lg border border-border">
              <div className="border-b border-border bg-muted/40 px-4 py-2">
                <p className="text-sm font-bold text-foreground">Permissions</p>
                <p className="text-[11px] text-muted-foreground">
                  Tick the module to grant View; then choose actions. Turning on any action enables View automatically.
                </p>
              </div>
              <div className="divide-y divide-border">
                {CENTER_MODULES.map((mod) => {
                  const row = perms[mod.key];
                  const allOn = mod.actions.every((a) => row[a]);
                  return (
                    <div key={mod.key} className="p-4 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allOn}
                          onChange={(e) => toggleAllRow(mod.key, e.target.checked)}
                          className="h-4 w-4 rounded border-border"
                        />
                        <span className="font-bold text-sm text-foreground">{mod.label}</span>
                      </label>
                      <div className="flex flex-wrap gap-3 pl-6">
                        {mod.actions.map((a) => (
                          <label key={a} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={row[a]}
                              onChange={() => toggle(mod.key, a)}
                              className="h-3.5 w-3.5 rounded border-border"
                            />
                            {mod.label} {ACTION_LABEL[a]}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {roleId ? "Save changes" : "Create role"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CenterRoleModal;
