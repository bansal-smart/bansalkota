import { useEffect, useState } from "react";
import { Image as ImageIcon, Loader2, Save, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Banner = {
  id: string;
  page_key: string;
  image_url: string | null;
  headline: string | null;
  subheading: string | null;
  cta_label: string | null;
  cta_link: string | null;
  is_active: boolean;
};

// Every public page that has a hero banner image.
const PAGES: { key: string; label: string; route: string }[] = [
  { key: "landing", label: "Landing", route: "/" },
  { key: "courses", label: "Courses", route: "/courses" },
  { key: "tests", label: "Tests", route: "/tests" },
  { key: "test-series", label: "Test Series", route: "/test-series" },
  { key: "live-classes", label: "Live Classes", route: "/live-classes" },
  { key: "educators", label: "Educators", route: "/educators" },
  
  { key: "admissions", label: "Admissions", route: "/admissions" },
  { key: "association", label: "Association", route: "/association" },
  { key: "boost", label: "BOOST 2026", route: "/boost" },
  { key: "centres", label: "Centres", route: "/centres" },
  { key: "achievements", label: "Achievements", route: "/achievements" },
  { key: "e-store", label: "E-Store", route: "/e-store" },
  { key: "career", label: "Careers", route: "/career" },
  { key: "contact", label: "Contact", route: "/contact" },
  { key: "pricing", label: "Pricing", route: "/pricing" },
  { key: "about", label: "About", route: "/about" },
];

const AdminBannersPage = () => {
  const [banners, setBanners] = useState<Record<string, Banner>>({});
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState(PAGES[0].key);
  const [form, setForm] = useState<Partial<Banner>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("site_banners").select("*");
    const map: Record<string, Banner> = {};
    (data ?? []).forEach((b: any) => (map[b.page_key] = b as Banner));
    setBanners(map);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const existing = banners[activeKey];
    setForm(
      existing ?? {
        page_key: activeKey,
        image_url: "",
        headline: "",
        subheading: "",
        cta_label: "",
        cta_link: "",
        is_active: true,
      },
    );
  }, [activeKey, banners]);

  const uploadImage = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `banners/${activeKey}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file, { upsert: true });
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: data.publicUrl }));
    setUploading(false);
    toast.success("Image uploaded");
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      page_key: activeKey,
      image_url: form.image_url || null,
      headline: form.headline || null,
      subheading: form.subheading || null,
      cta_label: form.cta_label || null,
      cta_link: form.cta_link || null,
      is_active: form.is_active ?? true,
    };
    const { error } = await supabase
      .from("site_banners")
      .upsert(payload, { onConflict: "page_key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Banner saved");
    load();
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <ImageIcon className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-black">Page Banners</h1>
          <p className="text-sm text-muted-foreground">
            Override the hero banner image, headline and CTA shown on each public page.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Page picker */}
        <aside className="rounded-2xl border border-border bg-card p-2 max-h-[70vh] overflow-y-auto">
          {PAGES.map((p) => {
            const has = banners[p.key];
            return (
              <button
                key={p.key}
                onClick={() => setActiveKey(p.key)}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm font-medium flex items-center justify-between ${
                  activeKey === p.key ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}
              >
                <span>{p.label}</span>
                {has?.is_active && <span className="rounded-full bg-green-500 h-1.5 w-1.5" />}
              </button>
            );
          })}
        </aside>

        {/* Editor */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-bold">{PAGES.find((p) => p.key === activeKey)?.label} hero</h2>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={form.is_active ?? true}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  Active (use this banner)
                </label>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground">Banner image</label>
                <div className="mt-1 flex items-center gap-3">
                  {form.image_url ? (
                    <img src={form.image_url} alt="" className="h-24 w-48 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="h-24 w-48 rounded-lg border border-dashed border-border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground">Uses default</div>
                  )}
                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold cursor-pointer hover:bg-muted">
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                  </label>
                  {form.image_url && (
                    <button onClick={() => setForm({ ...form, image_url: "" })} className="text-xs text-destructive hover:underline">Remove (use default)</button>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2" placeholder="Headline override (optional)" value={form.headline ?? ""} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
                <textarea rows={2} className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2" placeholder="Subheading override (optional)" value={form.subheading ?? ""} onChange={(e) => setForm({ ...form, subheading: e.target.value })} />
                <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="CTA label (optional)" value={form.cta_label ?? ""} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} />
                <input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="CTA link (e.g. /admissions)" value={form.cta_link ?? ""} onChange={(e) => setForm({ ...form, cta_link: e.target.value })} />
              </div>

              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save banner
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBannersPage;
