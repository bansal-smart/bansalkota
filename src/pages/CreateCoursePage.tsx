import { useEffect, useState } from "react";
import { Upload, IndianRupee, Loader2 } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";
import { resolveContentOwnership } from "@/lib/centreOwnership";
import { RichTextEditor } from "@/components/RichTextEditor";
import { SERVICE_OPTIONS } from "@/pages/CourseDetailPage";
import { X } from "lucide-react";
import AspectRatioHint from "@/components/admin/AspectRatioHint";

const EDUCATION_LEVELS = [
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
  "Class 9th–10th",
  "Class 11th–12th",
  "Droppers",
];
const DURATION_OPTIONS = ["6 Months", "1 Year", "2 Years", "Up to 12 Months", "Up to 24 Months"];
const MODE_OPTIONS = ["Online", "Offline", "Hybrid", "Residential"];
const LANGUAGE_OPTIONS = ["English", "Hindi", "English / Hindi"];
const EXAM_OPTIONS = ["JEE", "NEET", "Foundation"];


const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

type DraftLecture = { id?: string; title: string; durationMin: number };
type DraftChapter = { id?: string; title: string; lectures: DraftLecture[] };

const CreateCoursePage = () => {
  const { user, isCenterAdmin } = useAuth();
  const { primaryCenterId } = useCenterAdmin();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId?: string }>();
  const location = useLocation();
  const isAdminContext = location.pathname.startsWith("/admin");
  const isEditMode = Boolean(courseId);

  const [name, setName] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [exam, setExam] = useState("JEE");
  const [educatorName, setEducatorName] = useState("");
  const [subjectInput, setSubjectInput] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [existingThumbnail, setExistingThumbnail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [chapters, setChapters] = useState<DraftChapter[]>([
    { title: "Chapter 1", lectures: [{ title: "Introduction", durationMin: 15 }] },
  ]);
  const [learnItems, setLearnItems] = useState<string[]>([]);
  const [learnInput, setLearnInput] = useState("");
  const [reqItems, setReqItems] = useState<string[]>([]);
  const [reqInput, setReqInput] = useState("");
  const [educationLevel, setEducationLevel] = useState<string>("Class 11th–12th");
  const [durationLabel, setDurationLabel] = useState<string>("1 Year");
  const [modeValue, setModeValue] = useState<string>(isCenterAdmin ? "Offline" : "Online");
  const [language, setLanguage] = useState<string>("English / Hindi");
  const [subjectsCovered, setSubjectsCovered] = useState<string[]>([]);
  const [includedServices, setIncludedServices] = useState<string[]>([]);
  const [endDate, setEndDate] = useState<string>("");       // course validity end date (access revoked after)
  // Franchise centres can only ever create centre-local, offline courses —
  // never global/online (that's HQ-only). Locked, not just defaulted.
  const [isGlobal, setIsGlobal] = useState<boolean>(!isCenterAdmin);
  const MODE_OPTIONS_FOR_ROLE = isCenterAdmin ? MODE_OPTIONS.filter((m) => m !== "Online") : MODE_OPTIONS;
  // Franchise centres can also just run an existing HQ/global course at their
  // own price instead of authoring their own content from scratch.
  const [adoptMode, setAdoptMode] = useState(false);


  // Load existing course in edit mode
  useEffect(() => {
    if (!isEditMode || !courseId) return;
    const load = async () => {
      setLoading(true);
      const { data: course, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId)
        .maybeSingle();
      if (error || !course) {
        toast.error("Course not found");
        setLoading(false);
        return;
      }
      setName(course.name ?? "");
      const c = course as unknown as Record<string, unknown>;
      setShortDesc((c.short_description as string | null) ?? "");
      setDescription(course.description ?? "");
      setDescriptionHtml((c.description_html as string | null) ?? "");
      setExam(course.target_exam ?? "JEE");
      setEducatorName(course.educator_name ?? "");
      setPrice(Number(course.price ?? 0));
      setOriginalPrice(Number(course.original_price ?? 0));
      setExistingThumbnail(course.thumbnail_url ?? null);
      setEducationLevel((c.education_level as string | null) ?? "Class 11th–12th");
      setDurationLabel((c.duration_label as string | null) ?? "1 Year");
      setModeValue((c.mode as string | null) ?? "Online");
      setLanguage((c.language as string | null) ?? "English / Hindi");
      setSubjectsCovered(((c.subjects_covered as string[] | null) ?? []) as string[]);
      setIncludedServices(((c.included_services as string[] | null) ?? []) as string[]);
      setLearnItems(((c.what_youll_learn as string[] | null) ?? []) as string[]);
      setReqItems(((c.requirements as string[] | null) ?? []) as string[]);
      setEndDate((c.end_date as string | null) ?? "");
      setIsGlobal((c.is_global as boolean | null) ?? true);




      const { data: chs } = await supabase
        .from("chapters")
        .select("id, title, position")
        .eq("course_id", courseId)
        .order("position");
      const chapterIds = (chs ?? []).map((c) => c.id);
      const { data: lessons } = chapterIds.length
        ? await supabase
            .from("lessons")
            .select("id, chapter_id, title, position, duration_seconds")
            .in("chapter_id", chapterIds)
            .order("position")
        : { data: [] as { id: string; chapter_id: string; title: string; position: number; duration_seconds: number }[] };
      const grouped: DraftChapter[] = (chs ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        lectures: (lessons ?? [])
          .filter((l) => l.chapter_id === c.id)
          .map((l) => ({ id: l.id, title: l.title, durationMin: Math.max(1, Math.round(l.duration_seconds / 60)) })),
      }));
      if (grouped.length) setChapters(grouped);
      setLoading(false);
    };
    load();
  }, [isEditMode, courseId]);

  const addLearn = () => {
    const v = learnInput.trim();
    if (!v) return;
    setLearnItems([...learnItems, v]);
    setLearnInput("");
  };
  const addReq = () => {
    const v = reqInput.trim();
    if (!v) return;
    setReqItems([...reqItems, v]);
    setReqInput("");
  };

  const addChapter = () => setChapters([...chapters, { title: `Chapter ${chapters.length + 1}`, lectures: [] }]);
  const removeChapter = (i: number) => setChapters(chapters.filter((_, j) => j !== i));
  const addLecture = (ci: number) => {
    const c = [...chapters];
    c[ci].lectures.push({ title: "New lecture", durationMin: 10 });
    setChapters(c);
  };
  const removeLecture = (ci: number, li: number) => {
    const c = [...chapters];
    c[ci].lectures.splice(li, 1);
    setChapters(c);
  };

  const submit = async (publish: boolean) => {
    if (!user) return toast.error("Please sign in");
    if (!name.trim()) return toast.error("Course title is required");
    

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

    const resolvedEducatorName =
      educatorName.trim() ||
      ((user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "Educator").trim();

    const sharedFields = {
      name,
      description: description || shortDesc,
      short_description: shortDesc || null,
      description_html: descriptionHtml || null,
      subject: subjectsCovered[0] || "General",
      target_exam: exam,
      educator_name: resolvedEducatorName,
      price,
      original_price: originalPrice || null,
      discount_percent: originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0,
      thumbnail_url: thumbnailUrl,
      is_published: publish,
      what_youll_learn: learnItems,
      requirements: reqItems,
      education_level: educationLevel || null,
      duration_label: durationLabel || null,
      mode: modeValue || null,
      language: language || null,
      subjects_covered: subjectsCovered,
      included_services: includedServices,
      end_date: endDate || null,
      is_global: isGlobal,
    };

    let workingCourseId = courseId;

    if (!isEditMode) {
      const baseSlug = slugify(name) || `course-${Date.now()}`;
      const slug = `${baseSlug}-${Date.now().toString(36)}`;

      // Centre-admin-created courses are owned by their own centre (offline,
      // centre-local — is_global is separately forced false above via the
      // hidden toggle, not by resolveContentOwnership, since admin/super_admin
      // need their own is_global checkbox choice preserved here).
      const { centre_id: ownerCentreId } = await resolveContentOwnership(isCenterAdmin, primaryCenterId);

      const { data: course, error: courseErr } = await supabase
        .from("courses")
        .insert({ ...sharedFields, slug, created_by: user.id, centre_id: ownerCentreId })
        .select("id, slug")
        .single();

      if (courseErr || !course) {
        console.error(courseErr);
        toast.error(courseErr?.message ?? "Could not create course");
        setSubmitting(false);
        return;
      }
      workingCourseId = course.id;
    } else {
      const { error: updErr } = await supabase
        .from("courses")
        .update(sharedFields)
        .eq("id", courseId!);

      if (updErr) {
        toast.error(updErr.message);
        setSubmitting(false);
        return;
      }
    }

    if (!workingCourseId) {
      setSubmitting(false);
      return;
    }

    // Curriculum (chapters + lessons) is managed from the dedicated Course Content page.


    toast.success(isEditMode ? "Course updated" : publish ? "Course published!" : "Draft saved");
    setSubmitting(false);
    navigate(isAdminContext ? "/admin/courses" : "/teacher/courses");
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isCenterAdmin && !isEditMode && adoptMode) {
    return (
      <div className="p-4 lg:p-6 pb-16 max-w-3xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-foreground">Create New Course</h1>
        <AdoptModeToggle adoptMode={adoptMode} setAdoptMode={setAdoptMode} />
        {primaryCenterId && user ? (
          <AdoptCoursesPanel centerId={primaryCenterId} userId={user.id} />
        ) : (
          <p className="text-sm text-muted-foreground">Loading centre…</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 pb-64 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">{isEditMode ? "Edit Course" : "Create New Course"}</h1>
      {isCenterAdmin && !isEditMode && <AdoptModeToggle adoptMode={adoptMode} setAdoptMode={setAdoptMode} />}

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Course Thumbnail</h2>
        <AspectRatioHint ratio="4:3" size="1200×900" note="course card thumbnail" />
        {existingThumbnail && !thumbnailFile && (
          <div className="w-48 aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted">
            <img src={existingThumbnail} alt="Current thumbnail" className="h-full w-full object-cover" />
          </div>
        )}
        <label className="block">
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setThumbnailFile(e.target.files?.[0] ?? null)} />
          <div className="rounded-lg border-2 border-dashed border-border bg-background p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">{thumbnailFile ? thumbnailFile.name : existingThumbnail ? "Click to replace thumbnail (4:3)" : "Click to upload thumbnail (4:3 aspect ratio)"}</p>
          </div>
        </label>
      </div>


      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Basic Information</h2>
        <div>
          <label className="text-xs font-semibold text-foreground">Course Title</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="e.g. JEE Physics Booster 2027"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground">Short Description</label>
          <textarea
            value={shortDesc}
            onChange={(e) => setShortDesc(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            placeholder="Shown below the course name (e.g. Online course for Class XII PCM students)"
            rows={3}
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground">Exam</label>
          <select value={exam} onChange={(e) => setExam(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
            {EXAM_OPTIONS.map((x) => <option key={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground">Subjects Covered</label>
          <p className="text-[11px] text-muted-foreground mb-1.5">Type a subject and press Enter to add as a chip.</p>
          {subjectsCovered.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {subjectsCovered.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/30 px-3 py-1 text-xs font-semibold">
                  {s}
                  <button
                    type="button"
                    onClick={() => setSubjectsCovered(subjectsCovered.filter((x) => x !== s))}
                    className="hover:text-destructive"
                    aria-label={`Remove ${s}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
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
              } else if (e.key === "Backspace" && !subjectInput && subjectsCovered.length) {
                setSubjectsCovered(subjectsCovered.slice(0, -1));
              }
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="e.g. Physics — press Enter"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">This Course Includes</h2>
        <p className="text-xs text-muted-foreground">These four values show in the "This Course Includes" row on the detail page.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground">Education Level</label>
            <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
              {EDUCATION_LEVELS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Duration</label>
            <select value={durationLabel} onChange={(e) => setDurationLabel(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
              {DURATION_OPTIONS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Mode</label>
            <select value={modeValue} onChange={(e) => setModeValue(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
              {MODE_OPTIONS_FOR_ROLE.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none">
              {LANGUAGE_OPTIONS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Access end date (validity)</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" title="Students lose access to this course after this date. Leave blank for no expiry." />
          </div>
          {!isCenterAdmin && (
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm font-medium" title="Global courses are visible/purchasable to students at every centre. Uncheck to keep it HQ-local (Kota students only).">
                <input type="checkbox" checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} className="h-4 w-4" />
                Global (all centres)
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Detailed Description</h2>
        <p className="text-xs text-muted-foreground">Rich text shown under "Know More Details" on the course page.</p>
        <RichTextEditor
          value={descriptionHtml}
          onChange={setDescriptionHtml}
          placeholder="Write a detailed description, fee notes, eligibility, etc."
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Course Includes</h2>
        <p className="text-xs text-muted-foreground">Tick what's included with this course. Selected icons appear on the right-side panel of the course detail page.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SERVICE_OPTIONS.map((s) => {
            const checked = includedServices.includes(s.key);
            return (
              <label
                key={s.key}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                  checked ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    setIncludedServices(
                      e.target.checked
                        ? [...includedServices, s.key]
                        : includedServices.filter((k) => k !== s.key),
                    )
                  }
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
            <label className="text-xs font-semibold text-foreground">Price</label>
            <div className="mt-1 flex items-center rounded-lg border border-border bg-background">
              <IndianRupee className="h-4 w-4 text-muted-foreground ml-3" />
              <input
                type="number"
                value={price || ""}
                onChange={(e) => setPrice(Number(e.target.value) || 0)}
                className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
                placeholder="1300"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Original Price (optional)</label>
            <div className="mt-1 flex items-center rounded-lg border border-border bg-background">
              <IndianRupee className="h-4 w-4 text-muted-foreground ml-3" />
              <input
                type="number"
                value={originalPrice || ""}
                onChange={(e) => setOriginalPrice(Number(e.target.value) || 0)}
                className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
                placeholder="2500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Spacer so floating action bar never overlaps the Pricing inputs */}
      <div aria-hidden className="h-40" />

      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none lg:left-[240px]">
        <div className="pointer-events-auto flex gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
          <button
            disabled={submitting}
            onClick={() => submit(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : isEditMode ? "Save as Draft" : "Save Draft"}
          </button>
          <button
            disabled={submitting}
            onClick={() => submit(true)}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : isEditMode ? "Save & Publish" : "Publish Course"}
          </button>
        </div>
      </div>
    </div>
  );

};

const AdoptModeToggle = ({ adoptMode, setAdoptMode }: { adoptMode: boolean; setAdoptMode: (v: boolean) => void }) => (
  <div className="inline-flex rounded-md border border-border p-0.5 text-xs">
    <button
      onClick={() => setAdoptMode(false)}
      className={`px-3 py-1.5 rounded ${!adoptMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
    >
      Create a new course
    </button>
    <button
      onClick={() => setAdoptMode(true)}
      className={`px-3 py-1.5 rounded ${adoptMode ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
    >
      Offer an existing HQ course
    </button>
  </div>
);

type AdoptableCourse = {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  thumbnail_url: string | null;
};

type OfferingRow = {
  id: string;
  course_id: string;
  price: number;
  original_price: number | null;
  is_active: boolean;
  course_name: string;
};

// Lets a franchise centre run an existing global/HQ course at their own
// price instead of authoring their own content — inserts into
// course_offerings, leaving the base courses row (content) untouched.
const AdoptCoursesPanel = ({ centerId, userId }: { centerId: string; userId: string }) => {
  const [loading, setLoading] = useState(true);
  const [adoptable, setAdoptable] = useState<AdoptableCourse[]>([]);
  const [offerings, setOfferings] = useState<OfferingRow[]>([]);
  const [draftPrices, setDraftPrices] = useState<Record<string, { price: string; original_price: string }>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: courses }, { data: offeringRows }] = await Promise.all([
      supabase
        .from("courses")
        .select("id, name, price, original_price, thumbnail_url")
        .eq("is_published", true)
        .eq("is_global", true)
        .order("name"),
      (supabase as any)
        .from("course_offerings")
        .select("id, course_id, price, original_price, is_active, course:courses(name)")
        .eq("centre_id", centerId)
        .order("created_at", { ascending: false }),
    ]);
    const offeredIds = new Set((offeringRows ?? []).map((o: any) => o.course_id));
    setAdoptable(((courses ?? []) as AdoptableCourse[]).filter((c) => !offeredIds.has(c.id)));
    setOfferings(
      (offeringRows ?? []).map((o: any) => ({
        id: o.id,
        course_id: o.course_id,
        price: o.price,
        original_price: o.original_price,
        is_active: o.is_active,
        course_name: o.course?.name ?? "Untitled course",
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerId]);

  const draftFor = (courseId: string, fallbackPrice: number, fallbackOriginal: number | null) =>
    draftPrices[courseId] ?? { price: String(fallbackPrice || ""), original_price: String(fallbackOriginal ?? "") };

  const setDraft = (courseId: string, field: "price" | "original_price", value: string) => {
    setDraftPrices((prev) => ({
      ...prev,
      [courseId]: { ...draftFor(courseId, 0, null), [field]: value },
    }));
  };

  const adopt = async (course: AdoptableCourse) => {
    const draft = draftFor(course.id, course.price, course.original_price);
    const price = Number(draft.price);
    if (!price || price <= 0) return toast.error("Enter a valid price");
    setSubmittingId(course.id);
    const { error } = await supabase.from("course_offerings").insert({
      course_id: course.id,
      centre_id: centerId,
      price,
      original_price: draft.original_price ? Number(draft.original_price) : null,
      created_by: userId,
    });
    setSubmittingId(null);
    if (error) {
      // Unique constraint (course_id, centre_id) — two tabs adopting the same course.
      if ((error as any).code === "23505") return toast.error("You already offer this course — edit it below.");
      return toast.error(error.message);
    }
    toast.success(`Now offering "${course.name}" at your centre`);
    load();
  };

  const updateOffering = async (offering: OfferingRow, changes: Partial<Pick<OfferingRow, "price" | "original_price" | "is_active">>) => {
    const { error } = await supabase.from("course_offerings").update(changes).eq("id", offering.id);
    if (error) return toast.error(error.message);
    load();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      {offerings.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-bold text-foreground">Your current offerings</h2>
          {offerings.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-3">
              <p className="flex-1 min-w-[10rem] text-sm font-semibold text-foreground">{o.course_name}</p>
              <div className="flex items-center rounded-lg border border-border bg-background">
                <IndianRupee className="h-3.5 w-3.5 text-muted-foreground ml-2" />
                <input
                  type="number"
                  defaultValue={o.price}
                  onBlur={(e) => {
                    const v = Number(e.target.value) || 0;
                    if (v > 0 && v !== o.price) updateOffering(o, { price: v });
                  }}
                  className="w-24 bg-transparent px-2 py-1.5 text-sm outline-none"
                />
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={o.is_active}
                  onChange={(e) => updateOffering(o, { is_active: e.target.checked })}
                  className="h-4 w-4"
                />
                Active
              </label>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-bold text-foreground">Adopt an HQ course</h2>
        <p className="text-xs text-muted-foreground">Pick a global course and set your own price to run it at your centre.</p>
        {adoptable.length === 0 ? (
          <p className="text-sm text-muted-foreground">No more global courses available to adopt.</p>
        ) : (
          adoptable.map((c) => {
            const draft = draftFor(c.id, c.price, c.original_price);
            return (
              <div key={c.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-3">
                <p className="flex-1 min-w-[10rem] text-sm font-semibold text-foreground">
                  {c.name} <span className="text-xs font-normal text-muted-foreground">(HQ price ₹{c.price})</span>
                </p>
                <div className="flex items-center rounded-lg border border-border bg-background">
                  <IndianRupee className="h-3.5 w-3.5 text-muted-foreground ml-2" />
                  <input
                    type="number"
                    value={draft.price}
                    onChange={(e) => setDraft(c.id, "price", e.target.value)}
                    placeholder="Your price"
                    className="w-24 bg-transparent px-2 py-1.5 text-sm outline-none"
                  />
                </div>
                <button
                  disabled={submittingId === c.id}
                  onClick={() => adopt(c)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  {submittingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Offer at my centre"}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CreateCoursePage;
