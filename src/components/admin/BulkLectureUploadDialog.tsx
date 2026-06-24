import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { Loader2, Upload, Download, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ParsedRow = {
  subject?: string;
  chapter: string;
  lecture: string;
  topic?: string;
  youtubeUrl: string;
  __rowNum: number;
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

const extractYouTubeId = (url: string): string | null => {
  const u = (url || "").trim();
  let m = u.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  m = u.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  m = u.match(/youtube\.com\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(u)) return u;
  return null;
};

const norm = (k: string) => k.toLowerCase().replace(/[\s_-]+/g, "");

const pick = (row: Record<string, any>, keys: string[]) => {
  const map: Record<string, any> = {};
  Object.keys(row).forEach((k) => (map[norm(k)] = row[k]));
  for (const k of keys) {
    const v = map[norm(k)];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
};

const TEMPLATE_HEADERS = ["subject", "Chapter Name", "Lecture Name", "topic", "Youtube Link"];

const downloadTemplate = () => {
  const sample = [
    TEMPLATE_HEADERS,
    ["INORGANIC CHEMISTRY", "01-Chemical Bonding", "01-IOC-XII-Chemical Bonding Lec-01", "", "https://youtu.be/BOVROvp4YHc"],
    ["INORGANIC CHEMISTRY", "01-Chemical Bonding", "01-IOC-XII-Chemical Bonding Lec-02", "Hybridisation", "https://youtu.be/2rt-3OfOREQ"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Lectures");
  XLSX.writeFile(wb, "bulk-lectures-template.xlsx");
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId: string;
  existingChapters: { id: string; title: string; position: number }[];
  existingLessonsCount: Record<string, number>; // chapterId -> count
  onDone: () => void;
};

const BulkLectureUploadDialog = ({ open, onOpenChange, courseId, existingChapters, existingLessonsCount, onDone }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errors, setErrors] = useState<string[]>([]);

  const reset = () => {
    setFile(null); setRows([]); setErrors([]); setProgress({ done: 0, total: 0 });
  };

  const handleFile = async (f: File | null) => {
    setFile(f); setRows([]); setErrors([]);
    if (!f) return;
    setParsing(true);
    try {
      const ext = f.name.split(".").pop()?.toLowerCase();
      let rawRows: Record<string, any>[] = [];
      if (ext === "csv") {
        const text = await f.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        rawRows = (parsed.data as Record<string, any>[]) ?? [];
      } else {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });
      }

      const parsed: ParsedRow[] = [];
      const errs: string[] = [];
      rawRows.forEach((r, idx) => {
        const rowNum = idx + 2; // header is row 1
        const chapter = pick(r, ["Chapter Name", "chapter", "chaptername"]);
        const lecture = pick(r, ["Lecture Name", "lecture", "lecturename", "title"]);
        const topic = pick(r, ["topic"]);
        const youtubeUrl = pick(r, ["Youtube Link", "youtube", "youtubeurl", "url", "link"]);
        const subject = pick(r, ["subject"]);
        if (!chapter || !lecture || !youtubeUrl) {
          errs.push(`Row ${rowNum}: missing ${[!chapter && "Chapter Name", !lecture && "Lecture Name", !youtubeUrl && "Youtube Link"].filter(Boolean).join(", ")}`);
          return;
        }
        if (!extractYouTubeId(youtubeUrl)) {
          errs.push(`Row ${rowNum}: invalid YouTube link`);
          return;
        }
        parsed.push({ subject, chapter, lecture, topic: topic || undefined, youtubeUrl, __rowNum: rowNum });
      });
      setRows(parsed);
      setErrors(errs);
    } catch (e: any) {
      toast.error(e?.message || "Failed to parse file");
    } finally {
      setParsing(false);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, ParsedRow[]>();
    rows.forEach((r) => {
      const k = r.chapter.trim();
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    return map;
  }, [rows]);

  const handleImport = async () => {
    if (rows.length === 0) { toast.error("No valid rows to import"); return; }
    setImporting(true);
    setProgress({ done: 0, total: rows.length });
    const failures: string[] = [];

    // Build chapter map (case-insensitive)
    const chMap = new Map<string, string>(); // titleLower -> id
    let nextChapterPos = existingChapters.length;
    existingChapters.forEach((c) => chMap.set(c.title.trim().toLowerCase(), c.id));

    // Pick a representative subject per chapter from the CSV rows
    const chapterSubject = new Map<string, string>(); // titleLower -> subject
    rows.forEach((r) => {
      const k = r.chapter.trim().toLowerCase();
      if (r.subject && !chapterSubject.has(k)) chapterSubject.set(k, r.subject.trim());
    });

    // Create missing chapters (with subject) and backfill subject on existing ones
    for (const chapterTitle of grouped.keys()) {
      const key = chapterTitle.toLowerCase();
      const subject = chapterSubject.get(key) || null;
      if (chMap.has(key)) {
        if (subject) {
          await supabase.from("chapters").update({ subject }).eq("id", chMap.get(key)!);
        }
        continue;
      }
      const { data, error } = await supabase
        .from("chapters")
        .insert({ course_id: courseId, title: chapterTitle, position: nextChapterPos++, subject })
        .select("id")
        .single();
      if (error || !data) {
        failures.push(`Chapter "${chapterTitle}": ${error?.message || "failed"}`);
        continue;
      }
      chMap.set(key, data.id);
    }

    // Insert lessons per chapter
    const posCounter: Record<string, number> = { ...existingLessonsCount };
    let done = 0;
    for (const [chapterTitle, list] of grouped.entries()) {
      const chId = chMap.get(chapterTitle.toLowerCase());
      if (!chId) { done += list.length; setProgress({ done, total: rows.length }); continue; }
      const startPos = posCounter[chId] ?? 0;
      const inserts = list.map((r, i) => {
        const ytId = extractYouTubeId(r.youtubeUrl)!;
        const title = r.topic ? `${r.topic} — ${r.lecture}` : r.lecture;
        return {
          course_id: courseId,
          chapter_id: chId,
          title,
          slug: `${slugify(r.lecture) || "lesson"}-${Date.now().toString(36)}-${i}`,
          position: startPos + i,
          duration_seconds: 600,
          video_url: `https://www.youtube.com/embed/${ytId}`,
          is_free_preview: false,
          is_published: true,
          type: "video",
        };
      });
      posCounter[chId] = startPos + list.length;

      // batch insert in chunks of 50
      for (let i = 0; i < inserts.length; i += 50) {
        const chunk = inserts.slice(i, i + 50);
        const { error } = await supabase.from("lessons").insert(chunk);
        if (error) failures.push(`Chapter "${chapterTitle}": ${error.message}`);
        done += chunk.length;
        setProgress({ done, total: rows.length });
      }
    }

    // Update course totals
    const { data: allLessons } = await supabase
      .from("lessons").select("duration_seconds").eq("course_id", courseId);
    const totalSecs = (allLessons ?? []).reduce((s, l) => s + (l.duration_seconds || 0), 0);
    await supabase.from("courses").update({
      total_lessons: (allLessons ?? []).length,
      duration_hours: Math.max(1, Math.round(totalSecs / 3600)),
    }).eq("id", courseId);

    setImporting(false);
    if (failures.length === 0) {
      toast.success(`Imported ${rows.length} lectures across ${grouped.size} chapter(s)`);
      reset();
      onOpenChange(false);
      onDone();
    } else {
      setErrors((prev) => [...prev, ...failures]);
      toast.warning(`Imported with ${failures.length} error(s). See details.`);
      onDone();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!importing) { onOpenChange(v); if (!v) reset(); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk upload lectures</DialogTitle>
          <DialogDescription>
            Upload an Excel (.xlsx) or CSV file. Columns: <strong>subject</strong>, <strong>Chapter Name</strong>, <strong>Lecture Name</strong>, <em>topic</em> (optional), <strong>Youtube Link</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4" /> Download template
            </Button>
            {file && (
              <Badge variant="secondary" className="gap-1">
                <FileSpreadsheet className="h-3 w-3" /> {file.name}
              </Badge>
            )}
          </div>

          <div>
            <Label htmlFor="bulk-file">Select file</Label>
            <Input
              id="bulk-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              disabled={importing}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {parsing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Parsing file…
            </div>
          )}

          {rows.length > 0 && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {rows.length} valid row{rows.length === 1 ? "" : "s"} across {grouped.size} chapter{grouped.size === 1 ? "" : "s"}
              </div>
              <div className="mt-2 max-h-32 overflow-auto space-y-1 text-xs text-muted-foreground">
                {Array.from(grouped.entries()).map(([ch, list]) => (
                  <div key={ch}>• <strong className="text-foreground">{ch}</strong> — {list.length} lecture{list.length === 1 ? "" : "s"}</div>
                ))}
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <div className="flex items-center gap-2 font-semibold text-destructive">
                <AlertCircle className="h-4 w-4" /> {errors.length} issue{errors.length === 1 ? "" : "s"}
              </div>
              <ul className="mt-1 max-h-32 overflow-auto list-disc pl-5 text-xs text-destructive/90">
                {errors.slice(0, 30).map((e, i) => <li key={i}>{e}</li>)}
                {errors.length > 30 && <li>…and {errors.length - 30} more</li>}
              </ul>
            </div>
          )}

          {importing && (
            <div className="text-sm text-muted-foreground">
              Importing {progress.done} / {progress.total}…
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={importing} onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={importing || rows.length === 0}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Import {rows.length > 0 ? `${rows.length} lectures` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkLectureUploadDialog;
