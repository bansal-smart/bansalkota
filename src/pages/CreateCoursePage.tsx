import { useState } from "react";
import { Plus, GripVertical, Trash2, Upload, Video, FileText, HelpCircle, IndianRupee } from "lucide-react";

const CreateCoursePage = () => {
  const [chapters, setChapters] = useState([
    { title: "Introduction to Mechanics", lectures: [
      { title: "What is Mechanics?", duration: "15 min", type: "video" },
      { title: "Units & Dimensions", duration: "25 min", type: "video" },
    ]},
    { title: "Newton's Laws of Motion", lectures: [
      { title: "First Law — Inertia", duration: "20 min", type: "video" },
    ]},
  ]);

  return (
    <div className="p-4 lg:p-6 pb-24 lg:pb-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">Create New Course</h1>

      {/* Section 1: Basic Info */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Basic Information</h2>
        <div>
          <label className="text-xs font-semibold text-foreground">Course Title</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" placeholder="e.g. JEE Physics Booster 2026" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground">Short Description</label>
          <input maxLength={150} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="150 chars max" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground">Full Description</label>
          <textarea rows={4} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none resize-none" placeholder="Detailed course description..." />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground">Exam Type</label>
            <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"><option>JEE</option><option>NEET</option><option>Class 11</option><option>Class 12</option></select>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Subject</label>
            <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"><option>Physics</option><option>Chemistry</option><option>Mathematics</option><option>Biology</option></select>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Language</label>
            <select className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"><option>English</option><option>Hindi</option><option>Hinglish</option></select>
          </div>
        </div>
      </div>

      {/* Section 2: Media */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Media</h2>
        <div>
          <label className="text-xs font-semibold text-foreground">Thumbnail (16:9)</label>
          <div className="mt-1 rounded-lg border-2 border-dashed border-border bg-background p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Drag & drop or click to upload</p>
            <p className="text-[10px] text-muted2 mt-1">Min 800×450, JPG/PNG</p>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground">Intro Video URL</label>
          <input className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none" placeholder="YouTube or Vimeo link" />
        </div>
      </div>

      {/* Section 3: Curriculum */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">Curriculum</h2>
          <button onClick={() => setChapters([...chapters, { title: "", lectures: [] }])} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"><Plus className="h-3 w-3" /> Add Chapter</button>
        </div>
        <div className="space-y-3">
          {chapters.map((ch, ci) => (
            <div key={ci} className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 mb-2">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <input value={ch.title} onChange={(e) => { const c = [...chapters]; c[ci].title = e.target.value; setChapters(c); }} className="flex-1 text-sm font-semibold bg-transparent outline-none text-foreground" placeholder="Chapter title" />
                <Trash2 className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-destructive shrink-0" onClick={() => setChapters(chapters.filter((_, j) => j !== ci))} />
              </div>
              <div className="ml-6 space-y-1.5">
                {ch.lectures.map((lec, li) => (
                  <div key={li} className="flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-xs">
                    {lec.type === "video" ? <Video className="h-3.5 w-3.5 text-primary shrink-0" /> : <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    <span className="flex-1 text-foreground">{lec.title}</span>
                    <span className="text-muted-foreground">{lec.duration}</span>
                    <Trash2 className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-destructive" />
                  </div>
                ))}
                <button onClick={() => { const c = [...chapters]; c[ci].lectures.push({ title: "", duration: "0 min", type: "video" }); setChapters(c); }} className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline ml-1"><Plus className="h-3 w-3" /> Add Lecture</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Pricing */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Pricing</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-foreground">Price</label>
            <div className="mt-1 flex items-center rounded-lg border border-border bg-background">
              <IndianRupee className="h-4 w-4 text-muted-foreground ml-3" />
              <input type="number" className="flex-1 bg-transparent px-2 py-2 text-sm outline-none" placeholder="1300" />
              <select className="bg-transparent text-xs text-muted-foreground pr-2 outline-none"><option>Monthly</option><option>One-time</option><option>Free</option></select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Original Price (for discount)</label>
            <div className="mt-1 flex items-center rounded-lg border border-border bg-background">
              <IndianRupee className="h-4 w-4 text-muted-foreground ml-3" />
              <input type="number" className="flex-1 bg-transparent px-2 py-2 text-sm outline-none" placeholder="2500" />
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Settings */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-bold text-foreground">Settings</h2>
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground">Public preview for 1st lecture</span>
          <div className="w-10 h-5 rounded-full bg-primary relative cursor-pointer"><div className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-white" /></div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground">Certificate on completion</span>
          <div className="w-10 h-5 rounded-full bg-muted relative cursor-pointer"><div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white" /></div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground">Save Draft</button>
        <button className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground">Preview</button>
        <button className="flex-1 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground">Publish Course</button>
      </div>
    </div>
  );
};

export default CreateCoursePage;
