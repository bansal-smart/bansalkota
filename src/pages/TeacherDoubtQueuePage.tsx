import { useEffect, useState } from "react";
import { Send, Loader2, MessageCircle, ChevronLeft, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { usePagination } from "@/hooks/usePagination";
import { FormattedAnswer } from "@/components/FormattedAnswer";
import { dispatchEmailOnly } from "@/lib/notify";

type Doubt = {
  id: string;
  user_id: string;
  subject: string;
  topic: string | null;
  question_text: string;
  image_url: string | null;
  status: string;
  ai_answer: string | null;
  created_at: string;
};

const TeacherDoubtQueuePage = () => {
  const { user } = useAuth();
  const [doubts, setDoubts] = useState<Doubt[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "pending" | "answered">("pending");
  const [selected, setSelected] = useState<Doubt | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("doubts").select("*").order("created_at", { ascending: false });
    const list = (data ?? []) as Doubt[];
    setDoubts(list);
    const ids = Array.from(new Set(list.map((d) => d.user_id)));
    if (ids.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      (profiles ?? []).forEach((p: any) => {
        map[p.user_id] = p.full_name || "Student";
      });
      setStudentNames(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("teacher-doubts")
      .on("postgres_changes", { event: "*", schema: "public", table: "doubts" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = filter === "all" ? doubts : doubts.filter((d) => (filter === "pending" ? d.status !== "answered" : d.status === "answered"));
  const { page, setPage, totalPages, paged, total } = usePagination(filtered, 10);

  const sendAnswer = async () => {
    if (!user || !selected || !answer.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("doubt_answers").insert({
      doubt_id: selected.id,
      responder_id: user.id,
      responder_role: "teacher",
      answer_text: answer.trim(),
    });
    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }
    toast.success("Answer sent");
    // Fire-and-forget transactional email to student (in-app notification already created by DB trigger).
    (async () => {
      try {
        const { data: au } = await supabase.rpc("upcoming_live_class_reminders" as never, { _lookahead_minutes: 0 } as never).then(() => ({ data: null })).catch(() => ({ data: null }));
        // Lookup student email via auth.users is not allowed from client; rely on profiles + edge function fallback.
        const studentName = studentNames[selected.user_id] || "Student";
        // Edge function reads recipient email when we pass user_id-derived email; here we pass via templateData and let function resolve via service role.
        await supabase.functions.invoke("send-doubt-answered-email", {
          body: {
            studentUserId: selected.user_id,
            studentName,
            subject: selected.subject,
            doubtId: selected.id,
            answerPreview: answer.trim().slice(0, 280),
          },
        });
        void au;
      } catch (err) {
        console.warn("doubt-answered email dispatch failed", err);
      }
    })();
    setAnswer("");
    setSubmitting(false);
    load();
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-57px)] min-w-0">
      <div className="md:w-[300px] lg:w-[340px] xl:w-[380px] shrink-0 border-b md:border-b-0 md:border-r border-border bg-card overflow-y-auto max-h-[40vh] md:max-h-none">
        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-bold text-foreground">Doubt Queue</h1>
          <div className="flex gap-2 mt-3">
            {(["all", "pending", "answered"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${
                  filter === f ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground border border-border"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <MessageCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No doubts in this filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {paged.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setSelected(d);
                  setAnswer("");
                }}
                className={`w-full text-left p-4 hover:bg-background transition-colors ${selected?.id === d.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">{d.subject}</span>
                  <span className="text-[10px] text-muted-foreground capitalize ml-auto">{d.status.replace("_", " ")}</span>
                </div>
                <p className="text-[11px] font-semibold text-foreground truncate">{studentNames[d.user_id] || "Student"}</p>
                <p className="text-xs text-foreground line-clamp-2 mt-0.5">{d.question_text}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(d.created_at).toLocaleString()}</p>
              </button>
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 p-3 bg-card">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="rounded-md border border-border px-2 py-1 text-xs disabled:opacity-40 inline-flex items-center gap-1"
                >
                  <ChevronLeft className="h-3 w-3" /> Prev
                </button>
                <span className="text-[10px] text-muted-foreground">
                  Page {page} of {totalPages} · {total} total
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="rounded-md border border-border px-2 py-1 text-xs disabled:opacity-40 inline-flex items-center gap-1"
                >
                  Next <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col bg-background overflow-y-auto">
        {selected ? (
          <>
            <div className="p-4 md:p-5 border-b border-border bg-card space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{selected.subject}</span>
                {selected.topic && <span className="text-[10px] text-muted-foreground">{selected.topic}</span>}
                <span className="text-[10px] text-muted-foreground capitalize ml-auto">{selected.status.replace("_", " ")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-light text-[10px] font-bold text-primary">
                  {(studentNames[selected.user_id] || "S").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{studentNames[selected.user_id] || "Student"}</p>
                  <p className="text-[10px] text-muted-foreground">Asked {new Date(selected.created_at).toLocaleString()}</p>
                </div>
              </div>
              <p className="text-sm text-foreground whitespace-pre-line break-words">{selected.question_text}</p>
              {selected.image_url && (
                <div className="relative inline-block">
                  <img src={selected.image_url} alt="Doubt" className="rounded-lg max-h-64 object-contain" />
                  <button
                    type="button"
                    onClick={async () => {
                      await supabase.from("doubts").update({ image_url: null }).eq("id", selected.id);
                    }}
                    className="absolute top-1 right-1 h-7 w-7 rounded-full bg-background/90 border border-border flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors shadow"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {selected.ai_answer && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
                  <p className="text-[10px] font-bold text-primary uppercase">AI suggested answer</p>
                  <FormattedAnswer content={selected.ai_answer} tone="primary" className="text-xs md:text-sm" />
                </div>
              )}
            </div>
            <div className="p-4 md:p-5 space-y-3 flex-1">
              <p className="text-xs font-semibold text-foreground">Your answer (markdown supported)</p>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={6}
                placeholder="Type your detailed answer... You can use **bold**, lists, and steps."
                className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none resize-y focus:border-primary"
              />
              <button
                disabled={submitting || !answer.trim()}
                onClick={sendAnswer}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50 inline-flex items-center gap-2"
              >
                {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Send Answer
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-6 text-center">Select a doubt from the list to view and answer</div>
        )}
      </div>
    </div>
  );
};

export default TeacherDoubtQueuePage;
