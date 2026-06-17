import { useEffect, useState } from "react";
import { Loader2, Save, Upload, Plus, Trash2, ExternalLink, Megaphone, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LandingConfig, BannerItem } from "@/lib/landingSchemas";
import { DEFAULT_BANNERS } from "@/lib/landingBannerDefaults";

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
  is_published: true,
};

export default function AdminLandingPage() {
  const [cfg, setCfg] = useState<LandingConfig>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("landing_page_config" as any)
      .select("*")
      .eq("id", "default")
      .maybeSingle();
    if (data) setCfg(data as unknown as LandingConfig);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("landing_page_config" as any)
      .upsert(
        {
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
          is_published: cfg.is_published,
        },
        { onConflict: "id" },
      );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Landing page saved");
  };

  const uploadBanner = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `landing-new/banner-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file, { upsert: true });
    if (error) {
      setUploading(false);
      return toast.error(error.message);
    }
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    setCfg((c) => ({ ...c, hero: { ...c.hero, banner_url: data.publicUrl } }));
    setUploading(false);
    toast.success("Banner uploaded");
  };

  const setHero = (patch: Partial<LandingConfig["hero"]>) =>
    setCfg((c) => ({ ...c, hero: { ...c.hero, ...patch } }));
  const setDetails = (patch: Partial<LandingConfig["details"]>) =>
    setCfg((c) => ({ ...c, details: { ...c.details, ...patch } }));
  const setContact = (patch: Partial<LandingConfig["contact"]>) =>
    setCfg((c) => ({ ...c, contact: { ...c.contact, ...patch } }));
  const setForm = (patch: Partial<LandingConfig["form_config"]>) =>
    setCfg((c) => ({ ...c, form_config: { ...c.form_config, ...patch } }));

  const uploadGalleryBanner = async (index: number, file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `landing-new/banners/banner-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    setCfg((c) => {
      const next = [...c.banners];
      next[index] = { ...next[index], image_url: data.publicUrl };
      return { ...c, banners: next };
    });
    toast.success("Banner uploaded");
  };
  const updateBanner = (i: number, patch: Partial<BannerItem>) =>
    setCfg((c) => {
      const next = [...c.banners];
      next[i] = { ...next[i], ...patch };
      return { ...c, banners: next };
    });
  const moveBanner = (i: number, dir: -1 | 1) =>
    setCfg((c) => {
      const next = [...c.banners];
      const j = i + dir;
      if (j < 0 || j >= next.length) return c;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...c, banners: next };
    });
  const removeBanner = (i: number) =>
    setCfg((c) => ({ ...c, banners: c.banners.filter((_, x) => x !== i) }));
  const addBanner = () =>
    setCfg((c) => ({ ...c, banners: [...c.banners, { image_url: "", caption: "", link: "", alt: "" }] }));
  const resetDefaults = () => {
    setCfg((c) => ({ ...c, banners: DEFAULT_BANNERS.map((b) => ({ ...b })) }));
    toast.success("Reset to 4 starter banners — remember to Save");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Megaphone className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-black">Campaign Landing Page</h1>
            <p className="text-sm text-muted-foreground">Edits the public page at /new</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5">
            <Switch
              checked={cfg.is_published}
              onCheckedChange={(v) => setCfg((c) => ({ ...c, is_published: v }))}
            />
            <span className="text-sm font-semibold">{cfg.is_published ? "Live" : "Hidden"}</span>
          </div>
          <Button variant="outline" asChild>
            <a href="/new" target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Preview
            </a>
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="highlights">Highlights</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="form">Form</TabsTrigger>
        </TabsList>

        {/* HERO */}
        <TabsContent value="hero" className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div>
            <Label>Banner image</Label>
            <div className="mt-2 flex items-center gap-3">
              {cfg.hero.banner_url && (
                <img src={cfg.hero.banner_url} alt="banner" className="h-20 w-32 rounded-md object-cover" />
              )}
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-semibold hover:bg-muted">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadBanner(e.target.files[0])}
                />
              </label>
              {cfg.hero.banner_url && (
                <Button variant="ghost" size="sm" onClick={() => setHero({ banner_url: "" })}>
                  Remove
                </Button>
              )}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Title (H1)</Label>
              <Input value={cfg.hero.title || ""} onChange={(e) => setHero({ title: e.target.value })} />
            </div>
            <div>
              <Label>Start date pill</Label>
              <Input value={cfg.hero.start_date || ""} onChange={(e) => setHero({ start_date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Subtitle / key benefit</Label>
            <Textarea rows={2} value={cfg.hero.subtitle || ""} onChange={(e) => setHero({ subtitle: e.target.value })} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <Label>Primary CTA label</Label>
              <Input value={cfg.hero.cta_label || ""} onChange={(e) => setHero({ cta_label: e.target.value })} />
            </div>
            <div className="flex items-end gap-3">
              <Switch
                checked={!!cfg.hero.seats_enabled}
                onCheckedChange={(v) => setHero({ seats_enabled: v })}
              />
              <div className="flex-1">
                <Label>Seats left</Label>
                <Input
                  type="number"
                  value={cfg.hero.seats_left ?? 0}
                  onChange={(e) => setHero({ seats_left: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <Switch
                checked={!!cfg.hero.early_bird_enabled}
                onCheckedChange={(v) => setHero({ early_bird_enabled: v })}
              />
              <div className="flex-1">
                <Label>Early bird deadline</Label>
                <Input
                  type="datetime-local"
                  value={cfg.hero.early_bird_deadline?.slice(0, 16) || ""}
                  onChange={(e) =>
                    setHero({ early_bird_deadline: e.target.value ? new Date(e.target.value).toISOString() : null })
                  }
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="rounded-lg border border-border bg-card p-5">
          <Label>Program overview</Label>
          <Textarea rows={8} value={cfg.overview || ""} onChange={(e) => setCfg((c) => ({ ...c, overview: e.target.value }))} />
        </TabsContent>

        {/* HIGHLIGHTS */}
        <TabsContent value="highlights" className="space-y-3 rounded-lg border border-border bg-card p-5">
          {cfg.highlights.map((h, i) => (
            <div key={i} className="grid gap-2 rounded-md border border-border p-3 md:grid-cols-[120px_1fr_2fr_auto]">
              <Input
                placeholder="Icon (lucide)"
                value={h.icon}
                onChange={(e) => {
                  const next = [...cfg.highlights];
                  next[i] = { ...h, icon: e.target.value };
                  setCfg((c) => ({ ...c, highlights: next }));
                }}
              />
              <Input
                placeholder="Title"
                value={h.title}
                onChange={(e) => {
                  const next = [...cfg.highlights];
                  next[i] = { ...h, title: e.target.value };
                  setCfg((c) => ({ ...c, highlights: next }));
                }}
              />
              <Input
                placeholder="Description"
                value={h.text}
                onChange={(e) => {
                  const next = [...cfg.highlights];
                  next[i] = { ...h, text: e.target.value };
                  setCfg((c) => ({ ...c, highlights: next }));
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCfg((c) => ({ ...c, highlights: c.highlights.filter((_, x) => x !== i) }))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setCfg((c) => ({ ...c, highlights: [...c.highlights, { icon: "Sparkles", title: "", text: "" }] }))
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Add highlight
          </Button>
          <p className="text-xs text-muted-foreground">
            Use Lucide icon names like <code>Zap</code>, <code>Target</code>, <code>Trophy</code>, <code>Sparkles</code>.
          </p>
        </TabsContent>

        {/* OUTCOMES */}
        <TabsContent value="outcomes" className="space-y-3 rounded-lg border border-border bg-card p-5">
          {cfg.outcomes.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={o}
                onChange={(e) => {
                  const next = [...cfg.outcomes];
                  next[i] = e.target.value;
                  setCfg((c) => ({ ...c, outcomes: next }));
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCfg((c) => ({ ...c, outcomes: c.outcomes.filter((_, x) => x !== i) }))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={() => setCfg((c) => ({ ...c, outcomes: [...c.outcomes, ""] }))}>
            <Plus className="mr-2 h-4 w-4" /> Add outcome
          </Button>
        </TabsContent>

        {/* DETAILS */}
        <TabsContent value="details" className="grid gap-3 rounded-lg border border-border bg-card p-5 md:grid-cols-2">
          {(
            [
              ["eligibility", "Eligibility"],
              ["duration", "Duration"],
              ["mode", "Mode (Online / Offline / Hybrid)"],
              ["batch_start", "Batch Start Date"],
              ["language", "Language"],
              ["schedule", "Schedule"],
            ] as const
          ).map(([k, label]) => (
            <div key={k}>
              <Label>{label}</Label>
              <Input value={(cfg.details as any)[k] || ""} onChange={(e) => setDetails({ [k]: e.target.value } as any)} />
            </div>
          ))}
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faq" className="space-y-3 rounded-lg border border-border bg-card p-5">
          {cfg.faqs.map((f, i) => (
            <div key={i} className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Question"
                  value={f.q}
                  onChange={(e) => {
                    const next = [...cfg.faqs];
                    next[i] = { ...f, q: e.target.value };
                    setCfg((c) => ({ ...c, faqs: next }));
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCfg((c) => ({ ...c, faqs: c.faqs.filter((_, x) => x !== i) }))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <Textarea
                placeholder="Answer"
                value={f.a}
                onChange={(e) => {
                  const next = [...cfg.faqs];
                  next[i] = { ...f, a: e.target.value };
                  setCfg((c) => ({ ...c, faqs: next }));
                }}
              />
            </div>
          ))}
          <Button variant="outline" onClick={() => setCfg((c) => ({ ...c, faqs: [...c.faqs, { q: "", a: "" }] }))}>
            <Plus className="mr-2 h-4 w-4" /> Add FAQ
          </Button>
        </TabsContent>

        {/* CONTACT */}
        <TabsContent value="contact" className="grid gap-3 rounded-lg border border-border bg-card p-5 md:grid-cols-2">
          <div>
            <Label>Phone</Label>
            <Input value={cfg.contact.phone || ""} onChange={(e) => setContact({ phone: e.target.value })} />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input value={cfg.contact.whatsapp || ""} onChange={(e) => setContact({ whatsapp: e.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={cfg.contact.email || ""} onChange={(e) => setContact({ email: e.target.value })} />
          </div>
          <div>
            <Label>Address</Label>
            <Input value={cfg.contact.address || ""} onChange={(e) => setContact({ address: e.target.value })} />
          </div>
        </TabsContent>

        {/* FORM */}
        <TabsContent value="form" className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Submit button label</Label>
              <Input value={cfg.form_config.submit_label || ""} onChange={(e) => setForm({ submit_label: e.target.value })} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Optional fields</Label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={cfg.form_config.show_city ?? true} onCheckedChange={(v) => setForm({ show_city: v })} />
                Show City field
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={!!cfg.form_config.show_message} onCheckedChange={(v) => setForm({ show_message: v })} />
                Show Message field
              </label>
            </div>
          </div>
          <div>
            <Label>Success message</Label>
            <Textarea
              rows={2}
              value={cfg.form_config.success_message || ""}
              onChange={(e) => setForm({ success_message: e.target.value })}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
