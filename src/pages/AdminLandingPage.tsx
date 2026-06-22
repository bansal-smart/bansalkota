import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Upload, Plus, Trash2, ExternalLink, Megaphone, ArrowUp, ArrowDown, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LandingConfig, FeaturedItem, FeaturedKind, UspItem } from "@/lib/landingSchemas";
import { useProductOptions } from "@/hooks/useFeaturedProducts";

const EMPTY: LandingConfig = {
  id: "default",
  hero: {},
  overview: "",
  highlights: [],
  outcomes: [],
  details: {},
  faqs: [],
  contact: {},
  form_config: {},
  banners: [],
  top_banner: { enabled: true },
  about: { enabled: true, usps: [] },
  featured: { enabled: true, items: [] },
  cta: { enabled: true },
  is_published: true,
};

async function uploadToStorage(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("site-content").upload(path, file, { upsert: true });
  if (error) { toast.error(error.message); return null; }
  const { data } = supabase.storage.from("site-content").getPublicUrl(path);
  return data.publicUrl;
}

function ProductPicker({
  kind, value, onChange,
}: { kind: FeaturedKind; value?: string; onChange: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const { data: options = [], isLoading } = useProductOptions(kind, search);
  const selected = options.find((o) => o.id === value);
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="max-h-44 overflow-y-auto rounded-md border border-border bg-background">
        {isLoading && <div className="p-2 text-xs text-muted-foreground">Loading…</div>}
        {!isLoading && options.length === 0 && <div className="p-2 text-xs text-muted-foreground">No results</div>}
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-muted ${value === o.id ? "bg-primary/10 text-primary" : ""}`}
          >
            {o.image ? <img src={o.image} className="h-7 w-10 rounded object-cover" /> : <div className="h-7 w-10 rounded bg-muted" />}
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{o.label}</div>
              {o.subtitle && <div className="truncate text-[10px] text-muted-foreground">{o.subtitle}</div>}
            </div>
          </button>
        ))}
      </div>
      {selected && <div className="text-[11px] text-muted-foreground">Selected: <strong>{selected.label}</strong></div>}
    </div>
  );
}

export default function AdminLandingPage() {
  const [cfg, setCfg] = useState<LandingConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("landing_page_config" as any).select("*").eq("id", "default").maybeSingle();
    if (data) {
      const d = data as any;
      setCfg({
        ...EMPTY,
        ...d,
        top_banner: { enabled: true, ...(d.top_banner || {}) },
        about: { enabled: true, usps: [], ...(d.about || {}) },
        featured: { enabled: true, items: [], ...(d.featured || {}) },
        cta: { enabled: true, ...(d.cta || {}) },
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("landing_page_config" as any).upsert({
      id: "default",
      hero: cfg.hero,
      overview: cfg.overview,
      highlights: cfg.highlights,
      outcomes: cfg.outcomes,
      details: cfg.details,
      faqs: cfg.faqs,
      contact: cfg.contact,
      form_config: cfg.form_config,
      banners: cfg.banners,
      top_banner: cfg.top_banner,
      about: cfg.about,
      featured: cfg.featured,
      cta: cfg.cta,
      is_published: cfg.is_published,
    }, { onConflict: "id" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Landing page saved");
  };

  // Section setters
  const setTop = (patch: Partial<LandingConfig["top_banner"]>) => setCfg((c) => ({ ...c, top_banner: { ...c.top_banner, ...patch } }));
  const setHero = (patch: Partial<LandingConfig["hero"]>) => setCfg((c) => ({ ...c, hero: { ...c.hero, ...patch } }));
  const setForm = (patch: Partial<LandingConfig["form_config"]>) => setCfg((c) => ({ ...c, form_config: { ...c.form_config, ...patch } }));
  const setAbout = (patch: Partial<LandingConfig["about"]>) => setCfg((c) => ({ ...c, about: { ...c.about, ...patch } }));
  const setFeat = (patch: Partial<LandingConfig["featured"]>) => setCfg((c) => ({ ...c, featured: { ...c.featured, ...patch } }));
  const setCta = (patch: Partial<LandingConfig["cta"]>) => setCfg((c) => ({ ...c, cta: { ...c.cta, ...patch } }));

  // USPs
  const addUsp = () => setAbout({ usps: [...(cfg.about.usps || []), { icon: "Sparkles", title: "", text: "" }] });
  const updateUsp = (i: number, patch: Partial<UspItem>) => {
    const next = [...(cfg.about.usps || [])]; next[i] = { ...next[i], ...patch }; setAbout({ usps: next });
  };
  const removeUsp = (i: number) => setAbout({ usps: (cfg.about.usps || []).filter((_, x) => x !== i) });
  const moveUsp = (i: number, dir: -1 | 1) => {
    const next = [...(cfg.about.usps || [])]; const j = i + dir;
    if (j < 0 || j >= next.length) return; [next[i], next[j]] = [next[j], next[i]]; setAbout({ usps: next });
  };

  // Featured items
  const addFeat = () => setFeat({ items: [...(cfg.featured.items || []), { kind: "course", ref_id: "" }] });
  const updateFeat = (i: number, patch: Partial<FeaturedItem>) => {
    const next = [...(cfg.featured.items || [])]; next[i] = { ...next[i], ...patch }; setFeat({ items: next });
  };
  const removeFeat = (i: number) => setFeat({ items: (cfg.featured.items || []).filter((_, x) => x !== i) });
  const moveFeat = (i: number, dir: -1 | 1) => {
    const next = [...(cfg.featured.items || [])]; const j = i + dir;
    if (j < 0 || j >= next.length) return; [next[i], next[j]] = [next[j], next[i]]; setFeat({ items: next });
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Megaphone className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-black">Campaign Landing Page</h1>
            <p className="text-sm text-muted-foreground">Edits the public page at /new — top banner, hero+form, about/USPs, featured products, CTA.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5">
            <Switch checked={cfg.is_published} onCheckedChange={(v) => setCfg((c) => ({ ...c, is_published: v }))} />
            <span className="text-sm font-semibold">{cfg.is_published ? "Live" : "Hidden"}</span>
          </div>
          <Button variant="outline" asChild>
            <a href="/new" target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Preview</a>
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="top_banner" className="w-full">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="top_banner">1. Top Banner</TabsTrigger>
          <TabsTrigger value="hero">2. Hero + Form</TabsTrigger>
          <TabsTrigger value="about">3. About + USPs</TabsTrigger>
          <TabsTrigger value="featured">4. Featured Products</TabsTrigger>
          <TabsTrigger value="cta">5. CTA</TabsTrigger>
        </TabsList>

        {/* TOP BANNER */}
        <TabsContent value="top_banner" className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Top full-width banner</h3>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={cfg.top_banner.enabled !== false} onCheckedChange={(v) => setTop({ enabled: v })} />
              Show this section
            </label>
          </div>
          <div>
            <Label>Banner image (recommended 1920×600)</Label>
            <div className="mt-2 flex items-center gap-3">
              {cfg.top_banner.image_url && <img src={cfg.top_banner.image_url} alt="banner" className="h-20 w-48 rounded-md object-cover" />}
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-semibold hover:bg-muted">
                <Upload className="h-4 w-4" /> Upload
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const url = await uploadToStorage(f, "landing-new/top-banner");
                  if (url) setTop({ image_url: url });
                }} />
              </label>
              {cfg.top_banner.image_url && <Button variant="ghost" size="sm" onClick={() => setTop({ image_url: "" })}>Remove</Button>}
            </div>
          </div>
          <div>
            <Label>Or image URL</Label>
            <Input value={cfg.top_banner.image_url || ""} onChange={(e) => setTop({ image_url: e.target.value })} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Alt text</Label><Input value={cfg.top_banner.alt || ""} onChange={(e) => setTop({ alt: e.target.value })} /></div>
            <div><Label>Whole-banner link (optional)</Label><Input placeholder="/admissions or https://…" value={cfg.top_banner.link || ""} onChange={(e) => setTop({ link: e.target.value })} /></div>
          </div>
          <div className="rounded-md border border-dashed border-border p-3">
            <p className="mb-2 text-xs font-bold text-muted-foreground">Optional overlay (leave blank for image-only banner)</p>
            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Headline</Label><Input value={cfg.top_banner.headline || ""} onChange={(e) => setTop({ headline: e.target.value })} /></div>
              <div><Label>Subheading</Label><Input value={cfg.top_banner.subheading || ""} onChange={(e) => setTop({ subheading: e.target.value })} /></div>
              <div><Label>CTA label</Label><Input value={cfg.top_banner.cta_label || ""} onChange={(e) => setTop({ cta_label: e.target.value })} /></div>
              <div><Label>CTA link</Label><Input value={cfg.top_banner.cta_link || ""} onChange={(e) => setTop({ cta_link: e.target.value })} /></div>
            </div>
          </div>
        </TabsContent>

        {/* HERO + FORM */}
        <TabsContent value="hero" className="space-y-4 rounded-lg border border-border bg-card p-5">
          <h3 className="font-bold">Hero content</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Title (H1)</Label><Input value={cfg.hero.title || ""} onChange={(e) => setHero({ title: e.target.value })} /></div>
            <div><Label>Start date pill</Label><Input value={cfg.hero.start_date || ""} onChange={(e) => setHero({ start_date: e.target.value })} /></div>
          </div>
          <div><Label>Subtitle / key benefit</Label><Textarea rows={2} value={cfg.hero.subtitle || ""} onChange={(e) => setHero({ subtitle: e.target.value })} /></div>
          <div className="grid gap-3 md:grid-cols-3">
            <div><Label>Primary CTA label</Label><Input value={cfg.hero.cta_label || ""} onChange={(e) => setHero({ cta_label: e.target.value })} /></div>
            <div className="flex items-end gap-3">
              <Switch checked={!!cfg.hero.seats_enabled} onCheckedChange={(v) => setHero({ seats_enabled: v })} />
              <div className="flex-1"><Label>Seats left</Label><Input type="number" value={cfg.hero.seats_left ?? 0} onChange={(e) => setHero({ seats_left: Number(e.target.value) })} /></div>
            </div>
            <div className="flex items-end gap-3">
              <Switch checked={!!cfg.hero.early_bird_enabled} onCheckedChange={(v) => setHero({ early_bird_enabled: v })} />
              <div className="flex-1"><Label>Early bird deadline</Label><Input type="datetime-local" value={cfg.hero.early_bird_deadline?.slice(0, 16) || ""} onChange={(e) => setHero({ early_bird_deadline: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <h3 className="font-bold">Lead form</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div><Label>Submit button label</Label><Input value={cfg.form_config.submit_label || ""} onChange={(e) => setForm({ submit_label: e.target.value })} /></div>
              <div className="flex flex-col gap-2">
                <Label>Optional fields</Label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={cfg.form_config.show_city ?? true} onCheckedChange={(v) => setForm({ show_city: v })} /> Show City</label>
                <label className="flex items-center gap-2 text-sm"><Switch checked={!!cfg.form_config.show_message} onCheckedChange={(v) => setForm({ show_message: v })} /> Show Message</label>
              </div>
            </div>
            <div className="mt-3"><Label>Success message</Label><Textarea rows={2} value={cfg.form_config.success_message || ""} onChange={(e) => setForm({ success_message: e.target.value })} /></div>
            <div className="mt-3"><Label>Contact phone (header click-to-call)</Label><Input value={cfg.contact.phone || ""} onChange={(e) => setCfg((c) => ({ ...c, contact: { ...c.contact, phone: e.target.value } }))} /></div>
          </div>
        </TabsContent>

        {/* ABOUT + USPs */}
        <TabsContent value="about" className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">About & USPs</h3>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={cfg.about.enabled !== false} onCheckedChange={(v) => setAbout({ enabled: v })} /> Show this section
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Eyebrow tag</Label><Input placeholder="WHY BANSAL" value={cfg.about.eyebrow || ""} onChange={(e) => setAbout({ eyebrow: e.target.value })} /></div>
            <div><Label>Title</Label><Input value={cfg.about.title || ""} onChange={(e) => setAbout({ title: e.target.value })} /></div>
          </div>
          <div><Label>Body</Label><Textarea rows={5} value={cfg.about.body || ""} onChange={(e) => setAbout({ body: e.target.value })} /></div>

          <div className="border-t border-border pt-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-bold">USP cards</h4>
              <Button size="sm" onClick={addUsp}><Plus className="mr-1 h-4 w-4" /> Add USP</Button>
            </div>
            <div className="space-y-2">
              {(cfg.about.usps || []).map((u, i) => (
                <div key={i} className="grid items-end gap-2 rounded-md border border-border p-3 md:grid-cols-[140px_1fr_2fr_auto]">
                  <div><Label className="text-xs">Lucide icon</Label><Input value={u.icon} onChange={(e) => updateUsp(i, { icon: e.target.value })} /></div>
                  <div><Label className="text-xs">Title</Label><Input value={u.title} onChange={(e) => updateUsp(i, { title: e.target.value })} /></div>
                  <div><Label className="text-xs">Description</Label><Input value={u.text} onChange={(e) => updateUsp(i, { text: e.target.value })} /></div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => moveUsp(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => moveUsp(i, 1)} disabled={i === (cfg.about.usps?.length || 0) - 1}><ArrowDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => removeUsp(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Icons: any Lucide name e.g. <code>Zap</code>, <code>Trophy</code>, <code>Target</code>, <code>BookOpen</code>.</p>
          </div>
        </TabsContent>

        {/* FEATURED */}
        <TabsContent value="featured" className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Featured products</h3>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={cfg.featured.enabled !== false} onCheckedChange={(v) => setFeat({ enabled: v })} /> Show this section
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Section title</Label><Input value={cfg.featured.title || ""} onChange={(e) => setFeat({ title: e.target.value })} /></div>
            <div><Label>Subtitle</Label><Input value={cfg.featured.subtitle || ""} onChange={(e) => setFeat({ subtitle: e.target.value })} /></div>
          </div>

          <div className="space-y-3">
            {(cfg.featured.items || []).map((it, i) => (
              <div key={i} className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[180px_1fr_1fr_auto]">
                <div>
                  <Label className="text-xs">Kind</Label>
                  <Select value={it.kind} onValueChange={(v) => updateFeat(i, { kind: v as FeaturedKind, ref_id: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test_series">Test Series</SelectItem>
                      <SelectItem value="course">Course</SelectItem>
                      <SelectItem value="book">Study Material (Book)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Pick product</Label>
                  <ProductPicker kind={it.kind} value={it.ref_id} onChange={(id) => updateFeat(i, { ref_id: id })} />
                </div>
                <div className="space-y-2">
                  <div><Label className="text-xs">Badge (optional)</Label><Input placeholder="NEW / BESTSELLER" value={it.badge || ""} onChange={(e) => updateFeat(i, { badge: e.target.value })} /></div>
                  <div><Label className="text-xs">Link override (optional)</Label><Input placeholder="/custom-link" value={it.link_override || ""} onChange={(e) => updateFeat(i, { link_override: e.target.value })} /></div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="icon" onClick={() => moveFeat(i, -1)} disabled={i === 0}><ArrowUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => moveFeat(i, 1)} disabled={i === (cfg.featured.items?.length || 0) - 1}><ArrowDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => removeFeat(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={addFeat}><Plus className="mr-2 h-4 w-4" /> Add product</Button>
          <p className="text-xs text-muted-foreground">Cards pull live title, image and price from the linked record.</p>
        </TabsContent>

        {/* CTA */}
        <TabsContent value="cta" className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Final CTA strip</h3>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={cfg.cta.enabled !== false} onCheckedChange={(v) => setCta({ enabled: v })} /> Show this section
            </label>
          </div>
          <div><Label>Headline</Label><Input value={cfg.cta.headline || ""} onChange={(e) => setCta({ headline: e.target.value })} /></div>
          <div><Label>Subheading</Label><Textarea rows={2} value={cfg.cta.subheading || ""} onChange={(e) => setCta({ subheading: e.target.value })} /></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Button label</Label><Input value={cfg.cta.button_label || ""} onChange={(e) => setCta({ button_label: e.target.value })} /></div>
            <div><Label>Button link</Label><Input placeholder="/admissions or #lead-form" value={cfg.cta.button_link || ""} onChange={(e) => setCta({ button_link: e.target.value })} /></div>
          </div>
          <div>
            <Label>Background image (optional)</Label>
            <div className="mt-2 flex items-center gap-3">
              {cfg.cta.background_image_url && <img src={cfg.cta.background_image_url} className="h-20 w-32 rounded-md object-cover" />}
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-semibold hover:bg-muted">
                <Upload className="h-4 w-4" /> Upload
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const url = await uploadToStorage(f, "landing-new/cta");
                  if (url) setCta({ background_image_url: url });
                }} />
              </label>
              {cfg.cta.background_image_url && <Button variant="ghost" size="sm" onClick={() => setCta({ background_image_url: "" })}>Remove</Button>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
