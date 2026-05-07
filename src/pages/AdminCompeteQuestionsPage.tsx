import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, Loader2, Swords } from "lucide-react";

type Q = {
  id: string;
  subject: string;
  topic: string;
  difficulty: string;
  question_text: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  is_active: boolean;
};

const empty: Omit<Q, "id"> = {
  subject: "Physics",
  topic: "Kinematics",
  difficulty: "medium",
  question_text: "",
  options: ["", "", "", ""],
  correct_index: 0,
  explanation: "",
  is_active: true,
};

const AdminCompeteQuestionsPage = () => {
  const [list, setList] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Omit<Q, "id"> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("compete_questions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setList((data ?? []) as unknown as Q[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.question_text.trim()) return toast.error("Question required");
    if (editing.options.some((o) => !o.trim())) return toast.error("All 4 options required");
    setSaving(true);
    const payload = {
      subject: editing.subject,
      topic: editing.topic,
      difficulty: editing.difficulty,
      question_text: editing.question_text,
      options: editing.options,
      correct_index: editing.correct_index,
      explanation: editing.explanation || null,
      is_active: editing.is_active,
    };
    const { error } = editing.id
      ? await supabase.from("compete_questions").update(payload).eq("id", editing.id)
      : await supabase.from("compete_questions").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("compete_questions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><Swords className="h-5 w-5 text-primary" /> Compete Questions</h1>
          <p className="text-sm text-muted-foreground">Curated MCQs for 1v1 battles ({list.length} total)</p>
        </div>
        <button onClick={() => setEditing({ ...empty })} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 inline-flex items-center gap-1">
          <Plus className="h-4 w-4" /> New Question
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr className="text-left">
                <th className="px-3 py-2 font-semibold">Subject</th>
                <th className="px-3 py-2 font-semibold">Topic</th>
                <th className="px-3 py-2 font-semibold">Difficulty</th>
                <th className="px-3 py-2 font-semibold">Question</th>
                <th className="px-3 py-2 font-semibold w-20">Active</th>
                <th className="px-3 py-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {list.map((q) => (
                <tr key={q.id} className="border-t border-border">
                  <td className="px-3 py-2">{q.subject}</td>
                  <td className="px-3 py-2">{q.topic}</td>
                  <td className="px-3 py-2 capitalize">{q.difficulty}</td>
                  <td className="px-3 py-2 max-w-md truncate">{q.question_text}</td>
                  <td className="px-3 py-2">{q.is_active ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setEditing({ ...q })} className="p-1 hover:bg-muted rounded"><Edit3 className="h-4 w-4" /></button>
                    <button onClick={() => remove(q.id)} className="p-1 hover:bg-destructive/10 text-destructive rounded ml-1"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">No questions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-card rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{editing.id ? "Edit Question" : "New Question"}</h2>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Subject"><input value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} className="input" /></Field>
              <Field label="Topic"><input value={editing.topic} onChange={(e) => setEditing({ ...editing, topic: e.target.value })} className="input" /></Field>
              <Field label="Difficulty">
                <select value={editing.difficulty} onChange={(e) => setEditing({ ...editing, difficulty: e.target.value })} className="input">
                  <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
                </select>
              </Field>
            </div>
            <Field label="Question">
              <textarea value={editing.question_text} onChange={(e) => setEditing({ ...editing, question_text: e.target.value })} rows={3} className="input" />
            </Field>
            {editing.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" checked={editing.correct_index === i} onChange={() => setEditing({ ...editing, correct_index: i })} />
                <input value={opt} placeholder={`Option ${String.fromCharCode(65 + i)}`} onChange={(e) => {
                  const opts = [...editing.options]; opts[i] = e.target.value; setEditing({ ...editing, options: opts });
                }} className="input flex-1" />
              </div>
            ))}
            <Field label="Explanation (optional)">
              <textarea value={editing.explanation ?? ""} onChange={(e) => setEditing({ ...editing, explanation: e.target.value })} rows={2} className="input" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} />
              Active (visible to students)
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.input { width: 100%; border: 1px solid hsl(var(--border)); background: hsl(var(--background)); border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; } .input:focus { border-color: hsl(var(--primary)); }`}</style>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block">
    <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</span>
    {children}
  </label>
);

export default AdminCompeteQuestionsPage;
