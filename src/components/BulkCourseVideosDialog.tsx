import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractYouTubeId, getYouTubeThumbnail } from "@/lib/youtube";
import { Download, Upload } from "lucide-react";

type Row = {
  subject: string; topic: string; subtopic_label?: string; subtopic?: string;
  video_title: string; youtube_url: string; duration?: string; is_preview?: string;
};

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = ""; let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === "," && !q) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };
  const headers = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = split(line);
    const r: any = {};
    headers.forEach((h, i) => (r[h] = cells[i] ?? ""));
    return r as Row;
  });
}

export default function BulkCourseVideosDialog({
  open, onOpenChange, courseId, onDone,
}: { open: boolean; onOpenChange: (b: boolean) => void; courseId: string; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  const run = async () => {
    if (!file) return toast.error("Select a CSV file");
    setBusy(true); setProgress("Reading file…");
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (!rows.length) { toast.error("No rows found"); setBusy(false); return; }

      const [subjRes, topRes] = await Promise.all([
        supabase.from("course_subjects" as any).select("id,name,position").eq("course_id", courseId),
        supabase.from("course_topics" as any).select("id,name,subject_id,position").eq("course_id", courseId),
      ]);
      const subjects = (subjRes.data as any[]) ?? [];
      const topics = (topRes.data as any[]) ?? [];

      const findOrCreateSubject = async (name: string) => {
        const key = name.trim().toLowerCase();
        let s = subjects.find((x) => x.name.trim().toLowerCase() === key);
        if (s) return s.id as string;
        const { data, error } = await supabase.from("course_subjects" as any).insert({
          course_id: courseId, name: name.trim(), position: subjects.length,
        }).select().single();
        if (error) throw error;
        subjects.push(data); return (data as any).id as string;
      };
      const findOrCreateTopic = async (subjectId: string, name: string) => {
        const key = name.trim().toLowerCase();
        let t = topics.find((x) => x.subject_id === subjectId && x.name.trim().toLowerCase() === key);
        if (t) return t.id as string;
        const siblings = topics.filter((x) => x.subject_id === subjectId);
        const { data, error } = await supabase.from("course_topics" as any).insert({
          course_id: courseId, subject_id: subjectId, name: name.trim(), position: siblings.length,
        }).select().single();
        if (error) throw error;
        topics.push(data); return (data as any).id as string;
      };

      let ok = 0, fail = 0;
      const topicVideoCounts = new Map<string, number>();
      // Sort rows so that within each (subject, topic), videos go in by natural title order
      // (Lec-01, Lec-02, … Lec-53) regardless of CSV row order.
      const sortedRows = [...rows].sort((a, b) => {
        const ka = `${(a.subject ?? "").toLowerCase()}|${(a.topic ?? "").toLowerCase()}`;
        const kb = `${(b.subject ?? "").toLowerCase()}|${(b.topic ?? "").toLowerCase()}`;
        if (ka !== kb) return ka.localeCompare(kb);
        return (a.video_title ?? "").localeCompare(b.video_title ?? "", undefined, {
          numeric: true,
          sensitivity: "base",
        });
      });
      for (let i = 0; i < sortedRows.length; i++) {
        const r = sortedRows[i];
        setProgress(`Importing ${i + 1} / ${sortedRows.length}…`);
        try {
          if (!r.subject || !r.topic || !r.video_title || !r.youtube_url) {
            throw new Error("Missing required column (subject, topic, video_title, youtube_url)");
          }
          const subjectId = await findOrCreateSubject(r.subject);
          const topicId = await findOrCreateTopic(subjectId, r.topic);
          const ytId = extractYouTubeId(r.youtube_url);
          // Find current max position in this topic so we append after existing videos.
          if (!topicVideoCounts.has(topicId)) {
            const { data: existing } = await supabase
              .from("subtopic_videos" as any)
              .select("position")
              .eq("course_id", courseId)
              .eq("topic_id", topicId)
              .order("position", { ascending: false })
              .limit(1);
            const maxPos = (existing?.[0] as any)?.position ?? -1;
            topicVideoCounts.set(topicId, maxPos + 1);
          }
          const pos = topicVideoCounts.get(topicId)!;
          // Accept either `subtopic_label` (new) or legacy `subtopic` header; treat ".", "-" as empty.
          const rawLabel = (r.subtopic_label ?? r.subtopic ?? "").trim();
          const subtopicLabel = rawLabel && !['.', '-', '—'].includes(rawLabel) ? rawLabel : null;
          const { error } = await supabase.from("subtopic_videos" as any).insert({
            course_id: courseId,
            topic_id: topicId,
            subtopic_label: subtopicLabel,
            title: r.video_title.trim(),
            youtube_url: r.youtube_url.trim(),
            youtube_video_id: ytId,
            thumbnail_url: ytId ? getYouTubeThumbnail(ytId) : null,
            duration_label: r.duration?.trim() || null,
            is_preview: String(r.is_preview ?? "").toLowerCase() === "true",
            position: pos,
          });
          if (error) throw error;
          topicVideoCounts.set(topicId, pos + 1);
          ok++;
        } catch (e: any) {
          console.error("Row failed", r, e);
          fail++;
        }
      }
      toast.success(`Imported ${ok} videos${fail ? ` · ${fail} failed` : ""}`);
      onDone(); onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Import failed");
    } finally {
      setBusy(false); setProgress("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Bulk Upload Course Videos</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Upload a CSV with columns: <code>subject, topic, subtopic_label, video_title, youtube_url, duration, is_preview</code>.
            Subjects / topics are matched by name (case-insensitive) and auto-created when missing.
            <code>subtopic_label</code> is optional — leave blank or use <code>-</code> for none; it appears as a small label under the video title.
          </p>
          <a href="/templates/course-videos-template.csv" download className="inline-flex items-center gap-1 text-primary hover:underline">
            <Download className="h-4 w-4" /> Download sample template
          </a>
          <div>
            <Label>CSV file</Label>
            <Input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          {progress && <p className="text-xs text-muted-foreground">{progress}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={run} disabled={busy || !file}><Upload className="h-4 w-4 mr-1" /> {busy ? "Importing…" : "Import"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
