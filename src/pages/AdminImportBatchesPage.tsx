import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, FileText, Trash2, ChevronDown, ChevronRight, Upload } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useConfirm } from "@/components/ConfirmDialog";

type Batch = {
  id: string;
  filename: string;
  target_type: string;
  target_id: string | null;
  uploaded_by: string;
  question_count: number | null;
  image_count: number | null;
  status: string;
  error_log: any;
  created_at: string;
};

const AdminImportBatchesPage = () => {
  const { confirm, ConfirmDialog } = useConfirm();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [uploaders, setUploaders] = useState<Map<string, string>>(new Map());
  const [tests, setTests] = useState<Map<string, { title: string; slug: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("question_import_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = (data ?? []) as Batch[];
    setBatches(rows);

    const userIds = Array.from(new Set(rows.map((r) => r.uploaded_by).filter(Boolean)));
    const testIds = Array.from(new Set(rows.filter((r) => r.target_type === "test").map((r) => r.target_id!).filter(Boolean)));
    const [pRes, tRes] = await Promise.all([
      userIds.length ? supabase.from("profiles").select("user_id, full_name").in("user_id", userIds) : Promise.resolve({ data: [] }),
      testIds.length ? supabase.from("tests").select("id, title, slug").in("id", testIds) : Promise.resolve({ data: [] }),
    ]);
    setUploaders(new Map(((pRes as any).data ?? []).map((p: any) => [p.user_id, p.full_name ?? "Staff"])));
    setTests(new Map(((tRes as any).data ?? []).map((t: any) => [t.id, { title: t.title, slug: t.slug }])));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const undoBatch = async (b: Batch) => {
    const ok = await confirm({
      title: `Undo import "${b.filename}"?`,
      description: `This will delete ${b.question_count ?? 0} imported question(s) from the ${b.target_type === "test" ? "test" : "question bank"} and remove the batch record. Storage images stay. This cannot be undone.`,
      confirmLabel: "Undo import",
    });
    if (!ok) return;
    const table = b.target_type === "test" ? "test_questions" : "question_bank";
    const { error: e1 } = await supabase.from(table).delete().eq("import_batch_id", b.id);
    if (e1) return toast.error(e1.message);
    const { error: e2 } = await supabase.from("question_import_batches").delete().eq("id", b.id);
    if (e2) return toast.error(e2.message);
    toast.success("Import undone");
    load();
  };

  const toggle = (id: string) => {
    const s = new Set(expanded);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpanded(s);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {ConfirmDialog}
      <div className="rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary p-6 text-white flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black font-display flex items-center gap-2"><Upload className="h-6 w-6" /> Question Import Batches</h1>
          <p className="text-white/90 text-sm mt-1">Audit every Word bulk import and undo if needed.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : batches.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No imports yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2 text-left">File</th>
              <th className="px-4 py-2 text-left">Target</th>
              <th className="px-4 py-2 text-left">Uploaded by</th>
              <th className="px-4 py-2 text-right">Questions</th>
              <th className="px-4 py-2 text-right">Images</th>
              <th className="px-4 py-2 text-center">Status</th>
              <th className="px-4 py-2 text-right">When</th>
              <th className="px-4 py-2 text-center">Actions</th>
            </tr></thead>
            <tbody>
              {batches.map((b) => {
                const target = b.target_type === "test" && b.target_id ? tests.get(b.target_id) : null;
                const errors: any[] = Array.isArray(b.error_log) ? b.error_log : (b.error_log?.errors ?? []);
                const hasErrors = errors.length > 0;
                return (
                  <>
                    <tr key={b.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">
                        {hasErrors && (
                          <button onClick={() => toggle(b.id)} className="text-muted-foreground hover:text-foreground">
                            {expanded.has(b.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2 font-medium text-foreground text-xs flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" /> {b.filename}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {b.target_type === "test" ? (
                          target ? <Link to={`/admin/tests/${target.slug}`} className="text-primary hover:underline">{target.title}</Link> : <span className="text-muted-foreground">Test (removed)</span>
                        ) : (
                          <Link to="/admin/question-bank" className="text-primary hover:underline">Question Bank</Link>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{uploaders.get(b.uploaded_by) ?? "Staff"}</td>
                      <td className="px-4 py-2 text-right">{b.question_count ?? 0}</td>
                      <td className="px-4 py-2 text-right">{b.image_count ?? 0}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          b.status === "completed" ? "bg-secondary/20 text-secondary" :
                          b.status === "failed" ? "bg-destructive/20 text-destructive" :
                          "bg-amber-500/20 text-amber-600"
                        }`}>{b.status}</span>
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-muted-foreground">{formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}</td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => undoBatch(b)} className="rounded-md p-1.5 text-destructive hover:bg-destructive/10" title="Undo this import">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                    {expanded.has(b.id) && hasErrors && (
                      <tr key={b.id + "-err"} className="border-b border-border bg-muted/20">
                        <td colSpan={9} className="px-6 py-3">
                          <p className="text-xs font-semibold text-destructive mb-2">{errors.length} error(s)</p>
                          <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-5">
                            {errors.slice(0, 20).map((e: any, i: number) => (
                              <li key={i}>{typeof e === "string" ? e : JSON.stringify(e)}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminImportBatchesPage;
