import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Profile = {
  id?: string;
  slug: string;
  name: string;
  title: string | null;
  hero_photo_url: string | null;
  headline: string | null;
  pull_quote: string | null;
  intro: string | null;
  recognition_text: string | null;
  tags: string[] | null;
  sort_order: number;
  is_active: boolean;
};

type Section = {
  id?: string;
  leadership_id?: string;
  heading: string;
  body: string;
  sort_order: number;
  _new?: boolean;
};

const blankProfile = (): Profile => ({
  slug: "", name: "", title: "", hero_photo_url: "", headline: "", pull_quote: "",
  intro: "", recognition_text: "", tags: [], sort_order: 0, is_active: true,
});

const AdminLeadershipPage = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sectionsByLeader, setSectionsByLeader] = useState<Record<string, Section[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [pRes, sRes] = await Promise.all([
      supabase.from("leadership_profiles").select("*").order("sort_order"),
      supabase.from("leadership_sections").select("*").order("sort_order"),
    ]);
    setProfiles((pRes.data ?? []) as Profile[]);
    const map: Record<string, Section[]> = {};
    (sRes.data ?? []).forEach((s: any) => {
      const k = s.leadership_id as string;
      if (!map[k]) map[k] = [];
      map[k].push(s as Section);
    });
    setSectionsByLeader(map);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const updateProfile = (idx: number, patch: Partial<Profile>) =>
    setProfiles((cur) => cur.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

  const saveProfile = async (idx: number) => {
    const p = profiles[idx];
    if (!p.slug.trim() || !p.name.trim()) { toast.error("Slug and name required"); return; }
    setSaving(`p-${idx}`);
    const payload = { ...p, tags: p.tags ?? [] };
    if (p.id) {
      const { error } = await supabase.from("leadership_profiles").update(payload).eq("id", p.id);
      if (error) toast.error(error.message); else toast.success("Profile saved");
    } else {
      const { data, error } = await supabase.from("leadership_profiles").insert(payload).select().single();
      if (error) toast.error(error.message);
      else { toast.success("Created"); setProfiles((cur) => cur.map((x, i) => (i === idx ? (data as Profile) : x))); }
    }
    setSaving(null);
  };

  const deleteProfile = async (idx: number) => {
    const p = profiles[idx];
    if (!confirm("Delete this leader and all sections?")) return;
    if (p.id) {
      const { error } = await supabase.from("leadership_profiles").delete().eq("id", p.id);
      if (error) { toast.error(error.message); return; }
    }
    setProfiles((cur) => cur.filter((_, i) => i !== idx));
  };

  const addSection = (leaderId: string) => {
    setSectionsByLeader((cur) => ({
      ...cur,
      [leaderId]: [...(cur[leaderId] ?? []), { heading: "", body: "", sort_order: (cur[leaderId]?.length ?? 0) + 1, _new: true, leadership_id: leaderId }],
    }));
  };

  const updateSection = (leaderId: string, idx: number, patch: Partial<Section>) =>
    setSectionsByLeader((cur) => ({
      ...cur,
      [leaderId]: cur[leaderId].map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));

  const saveSection = async (leaderId: string, idx: number) => {
    const s = sectionsByLeader[leaderId][idx];
    if (!s.heading.trim() || !s.body.trim()) { toast.error("Heading and body required"); return; }
    setSaving(`s-${leaderId}-${idx}`);
    const payload = { leadership_id: leaderId, heading: s.heading, body: s.body, sort_order: s.sort_order };
    if (s.id) {
      const { error } = await supabase.from("leadership_sections").update(payload).eq("id", s.id);
      if (error) toast.error(error.message); else toast.success("Saved");
    } else {
      const { data, error } = await supabase.from("leadership_sections").insert(payload).select().single();
      if (error) toast.error(error.message);
      else {
        toast.success("Added");
        setSectionsByLeader((cur) => ({
          ...cur,
          [leaderId]: cur[leaderId].map((x, i) => (i === idx ? (data as Section) : x)),
        }));
      }
    }
    setSaving(null);
  };

  const deleteSection = async (leaderId: string, idx: number) => {
    const s = sectionsByLeader[leaderId][idx];
    if (s.id && !confirm("Delete this section?")) return;
    if (s.id) {
      const { error } = await supabase.from("leadership_sections").delete().eq("id", s.id);
      if (error) { toast.error(error.message); return; }
    }
    setSectionsByLeader((cur) => ({
      ...cur,
      [leaderId]: cur[leaderId].filter((_, i) => i !== idx),
    }));
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-black">Leadership</h1>
          <p className="text-sm text-muted-foreground">Manage About-page leaders and their story sections</p>
        </div>
        <button onClick={() => setProfiles((cur) => [...cur, blankProfile()])}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
          <Plus className="h-4 w-4" /> Add Leader
        </button>
      </div>

      <div className="space-y-4">
        {profiles.map((p, idx) => {
          const isExpanded = expanded === (p.id ?? `new-${idx}`);
          const sections = p.id ? (sectionsByLeader[p.id] ?? []) : [];
          return (
            <div key={p.id ?? `new-${idx}`} className="rounded-xl border bg-card">
              <div className="p-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Slug (e.g. vk-bansal)"
                    value={p.slug} onChange={(e) => updateProfile(idx, { slug: e.target.value })} />
                  <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Name"
                    value={p.name} onChange={(e) => updateProfile(idx, { name: e.target.value })} />
                </div>
                <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Title (e.g. Founder, Bansal Classes)"
                  value={p.title ?? ""} onChange={(e) => updateProfile(idx, { title: e.target.value })} />
                <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Hero photo URL"
                  value={p.hero_photo_url ?? ""} onChange={(e) => updateProfile(idx, { hero_photo_url: e.target.value })} />
                <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Headline"
                  value={p.headline ?? ""} onChange={(e) => updateProfile(idx, { headline: e.target.value })} />
                <textarea className="w-full rounded-lg border px-3 py-2 text-sm min-h-[70px]" placeholder="Pull quote"
                  value={p.pull_quote ?? ""} onChange={(e) => updateProfile(idx, { pull_quote: e.target.value })} />
                <textarea className="w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]" placeholder="Intro paragraph"
                  value={p.intro ?? ""} onChange={(e) => updateProfile(idx, { intro: e.target.value })} />
                <textarea className="w-full rounded-lg border px-3 py-2 text-sm min-h-[70px]" placeholder="Recognition text"
                  value={p.recognition_text ?? ""} onChange={(e) => updateProfile(idx, { recognition_text: e.target.value })} />
                <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Tags (comma separated)"
                  value={(p.tags ?? []).join(", ")}
                  onChange={(e) => updateProfile(idx, { tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
                <div className="grid sm:grid-cols-3 gap-3 items-center">
                  <input type="number" className="rounded-lg border px-3 py-2 text-sm" placeholder="Sort order"
                    value={p.sort_order} onChange={(e) => updateProfile(idx, { sort_order: Number(e.target.value) })} />
                  <button onClick={() => updateProfile(idx, { is_active: !p.is_active })}
                    className="inline-flex items-center gap-2 text-sm font-medium">
                    {p.is_active ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                    {p.is_active ? "Active" : "Hidden"}
                  </button>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => deleteProfile(idx)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => saveProfile(idx)} disabled={saving === `p-${idx}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground disabled:opacity-50">
                      {saving === `p-${idx}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                    </button>
                  </div>
                </div>
              </div>

              {p.id && (
                <div className="border-t">
                  <button onClick={() => setExpanded(isExpanded ? null : p.id!)}
                    className="w-full flex items-center justify-between p-3 text-sm font-bold hover:bg-muted/50">
                    <span>Story sections ({sections.length})</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {isExpanded && (
                    <div className="p-4 space-y-3 bg-muted/20">
                      {sections.map((s, sidx) => (
                        <div key={s.id ?? `new-${sidx}`} className="rounded-lg border bg-card p-3 space-y-2">
                          <div className="grid sm:grid-cols-4 gap-2">
                            <input className="sm:col-span-3 rounded-lg border px-3 py-2 text-sm" placeholder="Heading"
                              value={s.heading} onChange={(e) => updateSection(p.id!, sidx, { heading: e.target.value })} />
                            <input type="number" className="rounded-lg border px-3 py-2 text-sm" placeholder="Order"
                              value={s.sort_order} onChange={(e) => updateSection(p.id!, sidx, { sort_order: Number(e.target.value) })} />
                          </div>
                          <textarea className="w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]" placeholder="Body"
                            value={s.body} onChange={(e) => updateSection(p.id!, sidx, { body: e.target.value })} />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => deleteSection(p.id!, sidx)} className="rounded-lg border p-1.5 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => saveSection(p.id!, sidx)}
                              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">
                              {saving === `s-${p.id}-${sidx}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                            </button>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => addSection(p.id!)}
                        className="w-full rounded-lg border-2 border-dashed p-3 text-sm font-bold text-muted-foreground hover:border-primary hover:text-primary">
                        <Plus className="inline h-4 w-4 mr-1" /> Add section
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {profiles.length === 0 && <div className="text-center py-12 text-muted-foreground">No leaders yet</div>}
      </div>
    </div>
  );
};

export default AdminLeadershipPage;
