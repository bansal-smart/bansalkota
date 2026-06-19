import { useEffect, useMemo, useState } from "react";
import { Save, Loader2, Upload, Image as ImageIcon, Building2, Phone, Mail, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { toast } from "sonner";

type CenterForm = {
  city: string;
  area: string;
  state: string;
  region: string;
  address: string;
  phone: string;
  email: string;
  image_url: string;
  established: string;
  verified: boolean;
  is_published: boolean;
};

const CenterContentPage = () => {
  const { primaryCenterId, primaryCenter } = useCenterAdmin();
  const [form, setForm] = useState<CenterForm>({
    city: "",
    area: "",
    state: "",
    region: "",
    address: "",
    phone: "",
    email: "",
    image_url: "",
    established: "",
    verified: false,
    is_published: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!primaryCenterId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("centres")
        .select("city, area, state, region, address, phone, email, image_url, established, verified, is_published")
        .eq("id", primaryCenterId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        toast.error(error?.message ?? "Could not load centre details");
        setLoading(false);
        return;
      }
      setForm({
        city: data.city ?? "",
        area: data.area ?? "",
        state: data.state ?? "",
        region: data.region ?? "",
        address: data.address ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        image_url: data.image_url ?? "",
        established: data.established ? String(data.established) : "",
        verified: !!data.verified,
        is_published: data.is_published ?? true,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [primaryCenterId]);

  const centerName = useMemo(() => {
    if (!primaryCenter) return "Your Centre";
    return `${primaryCenter.city}${primaryCenter.area && primaryCenter.area !== primaryCenter.city ? ` — ${primaryCenter.area}` : ""}`;
  }, [primaryCenter]);

  const uploadImage = async (file: File) => {
    if (!primaryCenterId) return;
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `centers/${primaryCenterId}/hero-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-content").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("site-content").getPublicUrl(path);
    setForm((prev) => ({ ...prev, image_url: data.publicUrl }));
    setUploading(false);
    toast.success("Centre image uploaded");
  };

  const save = async () => {
    if (!primaryCenterId) return;
    if (!form.city.trim() || !form.state.trim() || !form.address.trim() || !form.phone.trim()) {
      toast.error("City, state, address and phone are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("centres").update({
      city: form.city.trim(),
      area: form.area.trim() || null,
      state: form.state.trim(),
      region: form.region.trim() || "North",
      address: form.address.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      image_url: form.image_url.trim() || null,
      established: form.established.trim() ? Number(form.established) : null,
      verified: form.verified,
      is_published: form.is_published,
    }).eq("id", primaryCenterId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Centre page details updated");
  };

  if (!primaryCenterId) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;
  if (loading) return <div className="p-8 text-sm text-muted-foreground">Loading centre content…</div>;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black font-display text-foreground">Centre Page Content</h1>
        <p className="text-sm text-muted-foreground">Manage the public details shown on {centerName}'s centre page.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Public centre details</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-foreground">City</label>
            <input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Area</label>
            <input value={form.area} onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">State</label>
            <input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Region</label>
            <input value={form.region} onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-foreground inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-primary" /> Address</label>
            <textarea value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-primary" /> Phone</label>
            <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-primary" /> Email</label>
            <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Established year</label>
            <input value={form.established} onChange={(e) => setForm((p) => ({ ...p, established: e.target.value.replace(/[^\d]/g, "") }))} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" />
          </div>
          <div className="flex items-end gap-6 pb-1">
            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={form.verified} onChange={(e) => setForm((p) => ({ ...p, verified: e.target.checked }))} /> Verified
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm((p) => ({ ...p, is_published: e.target.checked }))} /> Published
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Centre hero image</h2>
        </div>
        <p className="text-xs text-muted-foreground">Use a wide banner image where the face or key building detail stays visible. Recommended minimum size: 1600 × 900.</p>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {form.image_url ? (
            <img src={form.image_url} alt={`${centerName} centre`} className="h-40 w-full md:w-[320px] rounded-xl border border-border object-cover object-center" />
          ) : (
            <div className="h-40 w-full md:w-[320px] rounded-xl border border-dashed border-border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">No hero image uploaded</div>
          )}
          <div className="space-y-3">
            <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground cursor-pointer hover:bg-muted">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {uploading ? "Uploading…" : "Upload image"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
            </label>
            {form.image_url && (
              <button onClick={() => setForm((p) => ({ ...p, image_url: "" }))} className="block text-xs font-medium text-destructive hover:underline">
                Remove current image
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save centre content
        </button>
      </div>
    </div>
  );
};

export default CenterContentPage;
