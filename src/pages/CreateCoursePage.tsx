import { useEffect, useState } from "react";
import { Upload, IndianRupee, Loader2 } from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { RichTextEditor } from "@/components/RichTextEditor";
import { SERVICE_OPTIONS } from "@/pages/CourseDetailPage";
import { X } from "lucide-react";
import AspectRatioHint from "@/components/admin/AspectRatioHint";

const EDUCATION_LEVELS = [
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
const EXAM_OPTIONS = ["IIT-JEE", "NEET", "Foundation"];


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
  const { user } = useAuth();
  const navigate = useNavigate();
  const { courseId } = useParams<{ courseId?: string }>();
  const location = useLocation();
  const isAdminContext = location.pathname.startsWith("/admin");
  const isEditMode = Boolean(courseId);

  const [name, setName] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [exam, setExam] = useState("IIT-JEE");
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
  const [modeValue, setModeValue] = useState<string>("Online");
  const [language, setLanguage] = useState<string>("English / Hindi");
  const [subjectsCovered, setSubjectsCovered] = useState<string[]>([]);
  const [includedServices, setIncludedServices] = useState<string[]>([]);


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
      setExam(course.target_exam ?? "IIT-JEE");
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
    };

    let workingCourseId = courseId;

    if (!isEditMode) {
      const baseSlug = slugify(name) || `course-${Date.now()}`;
      const slug = `${baseSlug}-${Date.now().toString(36)}`;

      const { data: course, error: courseErr } = await supabase
        .from("courses")
        .insert({ ...sharedFields, slug, created_by: user.id })
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

  return (
    <div className="p-4 lg:p-6 pb-64 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">{isEditMode ? "Edit Course" : "Create New Course"}</h1>

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

export default CreateCoursePage;
