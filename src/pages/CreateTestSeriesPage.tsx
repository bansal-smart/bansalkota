import { useEffect, useState } from "react";
import { Upload, IndianRupee, Loader2, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { RichTextEditor } from "@/components/RichTextEditor";
import { SERVICE_OPTIONS } from "@/pages/CourseDetailPage";
import AspectRatioHint from "@/components/admin/AspectRatioHint";

const MODE_OPTIONS = ["Online", "Offline", "Hybrid"];
const LANGUAGE_OPTIONS = ["English", "Hindi", "English / Hindi"];
const EXAM_OPTIONS = ["IIT-JEE", "NEET", "Foundation", "Other"];

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

const CreateTestSeriesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  const [title, setTitle] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [exam, setExam] = useState("IIT-JEE");
  const [subject, setSubject] = useState("");
  const [subjectInput, setSubjectInput] = useState("");
  const [subjectsCovered, setSubjectsCovered] = useState<string[]>([]);
  const [totalTests, setTotalTests] = useState<number>(0);
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [price, setPrice] = useState<number>(0);
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [existingThumbnail, setExistingThumbnail] = useState<string | null>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState("");
  const [includedServices, setIncludedServices] = useState<string[]>([]);
  const [modeValue, setModeValue] = useState<string>("Online");
  const [language, setLanguage] = useState<string>("English / Hindi");
  const [isFeatured, setIsFeatured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    if (!isEditMode || !id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from("test_series").select("*").eq("id", id).maybeSingle();
      if (error || !data) {
        toast.error("Test series not found");
        setLoading(false);
        return;
      }
      const r = data as any;
      setTitle(r.title ?? "");
      setShortDesc(r.short_description ?? "");
      setDescription(r.description ?? "");
      setDescriptionHtml(r.description_html ?? "");
      setExam(r.target_exam ?? "IIT-JEE");
      setSubject(r.subject ?? "");
      setSubjectsCovered((r.subjects_covered as string[] | null) ?? []);
      setTotalTests(Number(r.total_tests ?? 0));
      setDurationMonths(Number(r.duration_months ?? 12));
      setPrice(Number(r.price ?? 0));
      setOriginalPrice(Number(r.original_price ?? 0));
      setExistingThumbnail(r.thumbnail_url ?? null);
      setFeatures((r.features as string[] | null) ?? []);
      setIncludedServices((r.included_services as string[] | null) ?? []);
      setModeValue(r.mode ?? "Online");
      setLanguage(r.language ?? "English / Hindi");
      setIsFeatured(!!r.is_featured);
      setLoading(false);
    })();
  }, [isEditMode, id]);

  const submit = async (publish: boolean) => {
    if (!user) return toast.error("Please sign in");
    if (!title.trim()) return toast.error("Title is required");

    setSubmitting(true);

    let thumbnailUrl: string | null = existingThumbnail;
    if (thumbnailFile) {
      const path = `${user.id}/${Date.now()}-${thumbnailFile.name}`;
      const { error: upErr } = await supabase.storage.from("educator-uploads").upload(path, thumbnailFile);
      if (upErr) {
        toast.error("Thumbnail upload failed");
        setSubmitting(false);
        return;
      }
      thumbnailUrl = supabase.storage.from("educator-uploads").getPublicUrl(path).data.publicUrl;
    }

    const payload: any = {
      title,
      short_description: shortDesc || null,
      description: description || shortDesc || null,
      description_html: descriptionHtml || null,
      target_exam: exam,
      subject: subject || null,
      subjects_covered: subjectsCovered,
      total_tests: totalTests,
      duration_months: durationMonths,
      price,
      original_price: originalPrice || null,
      discount_percent: originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0,
      thumbnail_url: thumbnailUrl,
      features,
      included_services: includedServices,
      language: language || null,
      mode: modeValue || null,
      is_published: publish,
      is_featured: isFeatured,
    };

    if (!isEditMode) {
      const baseSlug = slugify(title) || `test-series-${Date.now()}`;
      const slug = `${baseSlug}-${Date.now().toString(36)}`;
      const { error } = await supabase.from("test_series").insert({ ...payload, slug, created_by: user.id });
      if (error) {
        toast.error(error.message);
        setSubmitting(false);
        return;
      }
    } else {
      const { error } = await supabase.from("test_series").update(payload).eq("id", id!);
      if (error) {
        toast.error(error.message);
        setSubmitting(false);
        return;
      }
    }

    toast.success(isEditMode ? "Test series updated" : publish ? "Test series published!" : "Draft saved");
    setSubmitting(false);
    navigate("/admin/tests-hub?tab=series");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 pb-64 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">{isEditMode ? "Edit Test Series" : "Create New Test Series"}</h1>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Cover Image</h2>
        <AspectRatioHint ratio="4:3" size="1200×900" note="test series card cover" />
        {existingThumbnail && !thumbnailFile && (
          <div className="w-48 aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
            <img src={existingThumbnail} alt="Current thumbnail" className="h-full w-full object-cover" />
          </div>
        )}
        <label className="block">
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)} />
          <div className="rounded-lg border-2 border-dashed border-border bg-background p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">{thumbnailFile ? thumbnailFile.name : existingThumbnail ? "Click to replace cover" : "Click to upload cover image"}</p>
          </div>
        </label>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Basic Information</h2>
        <div>
          <label className="text-xs font-semibold text-foreground">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder="e.g. JEE Main 2027 AIR Test Series" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground">Short Description</label>
          <textarea value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="One-liner shown below the title" rows={3} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground">Target Exam</label>
            <select value={exam} onChange={(e) => setExam(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
              {EXAM_OPTIONS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Primary Subject</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="e.g. PCM / Biology" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground">Subjects Covered</label>
          <p className="text-[11px] text-muted-foreground mb-1.5">Press Enter to add as a chip.</p>
          {subjectsCovered.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {subjectsCovered.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/30 px-3 py-1 text-xs font-semibold">
                  {s}
                  <button type="button" onClick={() => setSubjectsCovered(subjectsCovered.filter((x) => x !== s))} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
          <input
            value={subjectInput}
            onChange={(e) => setSubjectInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                const v = subjectInput.trim().replace(/,$/, "");
                if (v && !subjectsCovered.includes(v)) setSubjectsCovered([...subjectsCovered, v]);
                setSubjectInput("");
              }
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="e.g. Physics — press Enter"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Series Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground">Total Tests</label>
            <input type="number" value={totalTests || ""} onChange={(e) => setTotalTests(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="e.g. 30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Access (Months)</label>
            <input type="number" value={durationMonths || ""} onChange={(e) => setDurationMonths(Number(e.target.value) || 0)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="e.g. 12" />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Mode</label>
            <select value={modeValue} onChange={(e) => setModeValue(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
              {MODE_OPTIONS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
              {LANGUAGE_OPTIONS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Detailed Description</h2>
        <p className="text-xs text-muted-foreground">Rich text shown on the test series detail page.</p>
        <RichTextEditor value={descriptionHtml} onChange={setDescriptionHtml} placeholder="Write a detailed description, schedule, syllabus, etc." />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Features ("What's Included" bullets)</h2>
        <p className="text-xs text-muted-foreground">Press Enter to add a feature line.</p>
        {features.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {features.map((f) => (
              <span key={f} className="inline-flex items-center gap-1 rounded-full bg-secondary/10 text-secondary border border-secondary/30 px-3 py-1 text-xs font-semibold">
                {f}
                <button type="button" onClick={() => setFeatures(features.filter((x) => x !== f))} className="hover:text-destructive"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
        <input
          value={featureInput}
          onChange={(e) => setFeatureInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = featureInput.trim();
              if (v && !features.includes(v)) setFeatures([...features, v]);
              setFeatureInput("");
            }
          }}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder="e.g. Full-length mocks aligned with latest NTA pattern"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">This Series Includes</h2>
        <p className="text-xs text-muted-foreground">Tick what's included. Shown on the detail page.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SERVICE_OPTIONS.map((s) => {
            const checked = includedServices.includes(s.key);
            return (
              <label key={s.key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${checked ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/50"}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setIncludedServices(e.target.checked ? [...includedServices, s.key] : includedServices.filter((k) => k !== s.key))}
                  className="h-4 w-4"
                />
                <s.icon className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">{s.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4 mb-6">
        <h2 className="text-sm font-bold text-foreground">Pricing</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground">Sale Price</label>
            <div className="mt-1 flex items-center rounded-lg border border-border bg-background">
              <IndianRupee className="h-4 w-4 text-muted-foreground ml-3" />
              <input type="number" value={price || ""} onChange={(e) => setPrice(Number(e.target.value) || 0)} className="flex-1 bg-transparent px-2 py-2 text-sm outline-none" placeholder="999" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">MRP (Original Price)</label>
            <div className="mt-1 flex items-center rounded-lg border border-border bg-background">
              <IndianRupee className="h-4 w-4 text-muted-foreground ml-3" />
              <input type="number" value={originalPrice || ""} onChange={(e) => setOriginalPrice(Number(e.target.value) || 0)} className="flex-1 bg-transparent px-2 py-2 text-sm outline-none" placeholder="1999" />
            </div>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm pt-2">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
          <span className="font-semibold text-foreground">Mark as Featured</span>
        </label>
      </div>

      <div aria-hidden className="h-40" />

      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none lg:left-[240px]">
        <div className="pointer-events-auto flex gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
          <button disabled={submitting} onClick={() => submit(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground disabled:opacity-50">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : isEditMode ? "Save as Draft" : "Save Draft"}
          </button>
          <button disabled={submitting} onClick={() => submit(true)} className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground disabled:opacity-50">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : isEditMode ? "Save & Publish" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTestSeriesPage;
