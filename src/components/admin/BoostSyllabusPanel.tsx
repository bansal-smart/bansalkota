import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, FileText, Upload, Eye, X, ArrowUp, ArrowDown, BookOpenCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BOOST_SYLLABUS_BUCKET, boostSyllabusPublicUrl } from "@/hooks/useBoostSyllabus";

type Row = {
  id: string;
  class_label: string;
  sort_order: number;
  sample_paper_path: string | null;
  syllabus_path: string | null;
};

type Slot = "sample_paper_path" | "syllabus_path";

/**
 * A PDF upload cell for the grid — shows an upload dropzone when empty, or a
 * View/Replace/Remove chip once a file exists. Deliberately not a plain text
 * input: admins upload the actual PDF here rather than pasting a URL.
 */
const FileCell = ({
  path,
  uploading,
  onUpload,
  onRemove,
}: {
  path: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) => {
  if (!path) {
    return (
      <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-muted/20 px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/40 hover:border-primary/40 transition-colors">
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        {uploading ? "Uploading…" : "Upload PDF"}
        <input
          type="file"
          accept="application/pdf"
          disabled={uploading}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.currentTarget.value = "";
          }}
        />
      </label>
    );
  }
  return (
    <div className="flex items-center justify-center gap-1">
      <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">
        <FileText className="h-3 w-3" /> PDF
      </span>
      <a
        href={boostSyllabusPublicUrl(path)}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        title="View"
      >
        <Eye className="h-3.5 w-3.5" />
      </a>
      <label className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Replace">
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        <input
          type="file"
          accept="application/pdf"
          disabled={uploading}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.currentTarget.value = "";
          }}
        />
      </label>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        title="Remove"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default function BoostSyllabusPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [savingLabelId, setSavingLabelId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("boost_syllabus_resources")
      .select("id, class_label, sort_order, sample_paper_path, syllabus_path")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    else setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addRow = async () => {
    const nextOrder = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 1;
    const { data, error } = await supabase
      .from("boost_syllabus_resources")
      .insert({ class_label: "New Class", sort_order: nextOrder })
      .select("id, class_label, sort_order, sample_paper_path, syllabus_path")
      .single();
    if (error) return toast.error(error.message);
    setRows((rs) => [...rs, data]);
  };

  const removeRow = async (row: Row) => {
    if (!window.confirm(`Remove "${row.class_label}" from the grid? This also deletes its uploaded PDFs.`)) return;
    const paths = [row.sample_paper_path, row.syllabus_path].filter((p): p is string => !!p);
    if (paths.length) await supabase.storage.from(BOOST_SYLLABUS_BUCKET).remove(paths);
    const { error } = await supabase.from("boost_syllabus_resources").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    toast.success("Row removed");
  };

  const saveLabel = async (row: Row, label: string) => {
    if (label === row.class_label) return;
    setSavingLabelId(row.id);
    const { error } = await supabase
      .from("boost_syllabus_resources")
      .update({ class_label: label })
      .eq("id", row.id);
    setSavingLabelId(null);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, class_label: label } : r)));
  };

  const move = async (row: Row, dir: -1 | 1) => {
    const idx = rows.findIndex((r) => r.id === row.id);
    const swapWith = rows[idx + dir];
    if (!swapWith) return;
    const [a, b] = [row.sort_order, swapWith.sort_order];
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase.from("boost_syllabus_resources").update({ sort_order: b }).eq("id", row.id),
      supabase.from("boost_syllabus_resources").update({ sort_order: a }).eq("id", swapWith.id),
    ]);
    if (e1 || e2) return toast.error(e1?.message ?? e2?.message ?? "Could not reorder");
    load();
  };

  const upload = async (row: Row, slot: Slot, file: File) => {
    if (file.size > 20 * 1024 * 1024) return toast.error("PDF must be ≤ 20 MB");
    const key = `${row.id}:${slot}`;
    setUploadingKey(key);
    const prefix = slot === "sample_paper_path" ? "sample-paper" : "syllabus";
    const path = `${row.id}/${prefix}-${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage
      .from(BOOST_SYLLABUS_BUCKET)
      .upload(path, file, { contentType: "application/pdf", upsert: true });
    if (upErr) { setUploadingKey(null); return toast.error(upErr.message); }

    const oldPath = row[slot];
    const { error: updErr } = await supabase
      .from("boost_syllabus_resources")
      .update({ [slot]: path })
      .eq("id", row.id);
    setUploadingKey(null);
    if (updErr) return toast.error(updErr.message);
    if (oldPath) await supabase.storage.from(BOOST_SYLLABUS_BUCKET).remove([oldPath]);

    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, [slot]: path } : r)));
    toast.success("Uploaded");
  };

  const removeFile = async (row: Row, slot: Slot) => {
    const path = row[slot];
    if (!path) return;
    if (!window.confirm("Remove this PDF?")) return;
    await supabase.storage.from(BOOST_SYLLABUS_BUCKET).remove([path]);
    const { error } = await supabase.from("boost_syllabus_resources").update({ [slot]: null }).eq("id", row.id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, [slot]: null } : r)));
    toast.success("Removed");
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="h-5 w-5 text-bansal-orange" />
          <h2 className="font-bold text-foreground">Syllabus &amp; Sample Papers</h2>
          <span className="text-xs text-muted-foreground">Shown as the "Sample Paper And Syllabus" table on the public /boost page.</span>
        </div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" /> Add Row
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="p-3 text-left text-xs font-semibold text-muted-foreground w-10"></th>
                <th className="p-3 text-left text-xs font-semibold text-muted-foreground">Class</th>
                <th className="p-3 text-center text-xs font-semibold text-muted-foreground">Sample Paper</th>
                <th className="p-3 text-center text-xs font-semibold text-muted-foreground">Syllabus</th>
                <th className="p-3 text-center text-xs font-semibold text-muted-foreground w-10">Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, i) => (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="p-2">
                    <div className="flex flex-col items-center">
                      <button type="button" disabled={i === 0} onClick={() => move(row, -1)} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Move up">
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button type="button" disabled={i === rows.length - 1} onClick={() => move(row, 1)} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" title="Move down">
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                  <td className="p-2 min-w-[140px]">
                    <input
                      defaultValue={row.class_label}
                      onBlur={(e) => saveLabel(row, e.target.value.trim() || row.class_label)}
                      disabled={savingLabelId === row.id}
                      className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm font-bold text-foreground hover:border-border focus:border-primary focus:bg-background outline-none transition-colors"
                    />
                  </td>
                  <td className="p-2 min-w-[150px]">
                    <FileCell
                      path={row.sample_paper_path}
                      uploading={uploadingKey === `${row.id}:sample_paper_path`}
                      onUpload={(f) => upload(row, "sample_paper_path", f)}
                      onRemove={() => removeFile(row, "sample_paper_path")}
                    />
                  </td>
                  <td className="p-2 min-w-[150px]">
                    <FileCell
                      path={row.syllabus_path}
                      uploading={uploadingKey === `${row.id}:syllabus_path`}
                      onUpload={(f) => upload(row, "syllabus_path", f)}
                      onRemove={() => removeFile(row, "syllabus_path")}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <button type="button" onClick={() => removeRow(row)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Remove row">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No rows yet — click "Add Row" to start the grid.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
