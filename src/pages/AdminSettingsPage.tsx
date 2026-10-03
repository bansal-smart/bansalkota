import { Settings, Globe, Loader2, Save, Phone, Mail, MessageCircle, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import type { ContactChannel } from "@/hooks/useContactChannels";

type PlatformSettings = {
  id: number;
  site_name: string;
  maintenance_mode: boolean;
  open_registrations: boolean;
  admin_email_alerts: boolean;
  updated_at: string;
};

const CHANNEL_KIND_ICON: Record<ContactChannel["kind"], typeof Phone> = {
  phone: Phone,
  email: Mail,
  whatsapp: MessageCircle,
};

const AdminSettingsPage = () => {
  const { isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [channels, setChannels] = useState<ContactChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [addingChannel, setAddingChannel] = useState(false);

  const loadChannels = async () => {
    const { data, error } = await supabase
      .from("contact_channels")
      .select("*")
      .order("display_order", { ascending: true });
    if (error) toast.error(error.message);
    setChannels((data ?? []) as ContactChannel[]);
    setChannelsLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) toast.error(error.message);
      setSettings((data as PlatformSettings) ?? null);
      setLoading(false);
    })();
    void loadChannels();
  }, []);

  const updateChannel = async (id: string, patch: Partial<ContactChannel>) => {
    const prev = channels;
    setChannels((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const { error } = await supabase.from("contact_channels").update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      setChannels(prev);
    }
  };

  const addChannel = async () => {
    setAddingChannel(true);
    const nextOrder = channels.length ? Math.max(...channels.map((c) => c.display_order)) + 1 : 0;
    const { data, error } = await supabase
      .from("contact_channels")
      .insert({ kind: "phone", label: "New Channel", value: "", href: "", display_order: nextOrder })
      .select("*")
      .single();
    setAddingChannel(false);
    if (error) return toast.error(error.message);
    setChannels((cs) => [...cs, data as ContactChannel]);
  };

  const deleteChannel = async (id: string) => {
    if (!window.confirm("Remove this contact channel? It will disappear from the public Contact page.")) return;
    const prev = channels;
    setChannels((cs) => cs.filter((c) => c.id !== id));
    const { error } = await supabase.from("contact_channels").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      setChannels(prev);
    }
  };

  const moveChannel = async (id: string, direction: -1 | 1) => {
    const idx = channels.findIndex((c) => c.id === id);
    const otherIdx = idx + direction;
    if (idx < 0 || otherIdx < 0 || otherIdx >= channels.length) return;
    const a = channels[idx];
    const b = channels[otherIdx];
    const reordered = [...channels];
    reordered[idx] = { ...b };
    reordered[otherIdx] = { ...a };
    setChannels(reordered);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("contact_channels").update({ display_order: b.display_order }).eq("id", a.id),
      supabase.from("contact_channels").update({ display_order: a.display_order }).eq("id", b.id),
    ]);
    if (e1 || e2) {
      toast.error((e1 ?? e2)?.message ?? "Failed to reorder");
      void loadChannels();
    }
  };

  const update = (patch: Partial<PlatformSettings>) =>
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings")
      .update({
        site_name: settings.site_name,
        maintenance_mode: settings.maintenance_mode,
        open_registrations: settings.open_registrations,
        admin_email_alerts: settings.admin_email_alerts,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
  };

  const Toggle = ({ on, toggle, disabled }: { on: boolean; toggle: () => void; disabled?: boolean }) => (
    <button
      onClick={toggle}
      disabled={disabled}
      className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return <div className="p-6 text-sm text-muted-foreground">Settings unavailable.</div>;
  }

  const readOnly = !isSuperAdmin;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl">
      <div className="rounded-2xl bg-[#1C3F8E] p-6 text-white">
        <div className="flex items-center gap-3"><Settings className="h-7 w-7" /><h1 className="text-2xl font-black font-display">Platform Settings</h1></div>
        <p className="text-white/90 text-sm mt-1">
          {readOnly ? "Read-only view. Only super admins can change platform settings." : "Configure global platform settings and features"}
        </p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4"><Globe className="h-4 w-4 text-primary" /> General</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Site Name</label>
              <input
                value={settings.site_name}
                disabled={readOnly}
                onChange={(e) => update({ site_name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary disabled:opacity-60"
              />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-foreground">Maintenance Mode</p><p className="text-xs text-muted-foreground">Temporarily disable access</p></div>
              <Toggle on={settings.maintenance_mode} disabled={readOnly} toggle={() => update({ maintenance_mode: !settings.maintenance_mode })} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-foreground">Open Registrations</p><p className="text-xs text-muted-foreground">Allow new student signups</p></div>
              <Toggle on={settings.open_registrations} disabled={readOnly} toggle={() => update({ open_registrations: !settings.open_registrations })} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> Direct Channels</h3>
            {!readOnly && (
              <button
                type="button"
                onClick={addChannel}
                disabled={addingChannel}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
              >
                <Plus className="h-3 w-3" /> Add channel
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-4">Shown as the "Direct Channels" list on the public Contact page.</p>

          {channelsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : (
            <div className="space-y-2">
              {channels.length === 0 && (
                <div className="text-xs text-muted-foreground italic">No channels yet.</div>
              )}
              {channels.map((c, i) => {
                const Icon = CHANNEL_KIND_ICON[c.kind] ?? Phone;
                return (
                  <div key={c.id} className={`rounded-lg border border-border p-3 ${!c.is_active ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <select
                        value={c.kind}
                        disabled={readOnly}
                        onChange={(e) => updateChannel(c.id, { kind: e.target.value as ContactChannel["kind"] })}
                        className="rounded-md border border-border bg-background px-2 py-1.5 text-xs disabled:opacity-60"
                      >
                        <option value="phone">Phone</option>
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                      <input
                        value={c.label}
                        disabled={readOnly}
                        onChange={(e) => updateChannel(c.id, { label: e.target.value })}
                        placeholder="Label (e.g. Admissions)"
                        className="flex-1 min-w-[140px] rounded-md border border-border bg-background px-2 py-1.5 text-xs disabled:opacity-60"
                      />
                      <input
                        value={c.value}
                        disabled={readOnly}
                        onChange={(e) => updateChannel(c.id, { value: e.target.value })}
                        placeholder="Display value (e.g. +91 9000000000)"
                        className="flex-1 min-w-[160px] rounded-md border border-border bg-background px-2 py-1.5 text-xs disabled:opacity-60"
                      />
                      <input
                        value={c.href}
                        disabled={readOnly}
                        onChange={(e) => updateChannel(c.id, { href: e.target.value })}
                        placeholder="Link (e.g. tel:+919000000000)"
                        className="flex-1 min-w-[180px] rounded-md border border-border bg-background px-2 py-1.5 text-xs disabled:opacity-60"
                      />
                      {!readOnly && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span title={c.is_active ? "Shown on public page" : "Hidden from public page"}>
                            <Toggle on={c.is_active} toggle={() => updateChannel(c.id, { is_active: !c.is_active })} />
                          </span>
                          <button
                            type="button"
                            onClick={() => moveChannel(c.id, -1)}
                            disabled={i === 0}
                            title="Move up"
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveChannel(c.id, 1)}
                            disabled={i === channels.length - 1}
                            title="Move down"
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted disabled:opacity-30"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteChannel(c.id)}
                            title="Delete channel"
                            className="p-1.5 rounded-md text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettingsPage;
