import { useEffect, useRef, useState } from "react";
import { ImageIcon, Send, Users, MessageCircle, X } from "lucide-react";
import { Conversation, useMentorMessages } from "@/hooks/useMentorChat";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  conversations: Conversation[];
  loading?: boolean;
  emptyHint?: string;
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const MentorChatPanel = ({ conversations, loading, emptyHint }: Props) => {
  const { user } = useAuth();
  const [active, setActive] = useState<Conversation | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const filePreview = file ? URL.createObjectURL(file) : null;
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, loading: msgsLoading, sending, send } = useMentorMessages(active);

  useEffect(() => {
    if (!active && conversations[0]) setActive(conversations[0]);
  }, [conversations, active]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => () => { if (filePreview) URL.revokeObjectURL(filePreview); }, [filePreview]);

  const handleSend = async () => {
    if (!text.trim() && !file) return;
    try {
      await send({ text, file });
      setText("");
      setFile(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send message");
    }
  };

  return (
    <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-0 overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[280px_1fr]">
      {/* Conversation list */}
      <aside className="flex flex-col border-r border-border bg-muted/20">
        <div className="border-b border-border p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conversations</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-xs text-muted-foreground">Loading…</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-xs text-muted-foreground">{emptyHint ?? "No conversations yet."}</div>
          ) : (
            conversations.map((c) => {
              const isActive = active?.id === c.id;
              const Icon = c.kind === "group" ? Users : MessageCircle;
              return (
                <button
                  key={c.id}
                  onClick={() => setActive(c)}
                  className={`flex w-full items-center gap-3 border-b border-border/40 px-3 py-3 text-left transition-colors ${
                    isActive ? "bg-secondary/15" : "hover:bg-muted/40"
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full ${c.kind === "group" ? "bg-primary/15 text-primary" : "bg-secondary/15 text-secondary"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{c.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{c.subtitle}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Active thread */}
      <section className="flex min-w-0 flex-col">
        {active ? (
          <>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{active.title}</p>
                <p className="text-[11px] text-muted-foreground">{active.subtitle}</p>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-background/40 p-4">
              {msgsLoading ? (
                <p className="text-center text-xs text-muted-foreground">Loading messages…</p>
              ) : messages.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground">No messages yet — say hello 👋</p>
              ) : (
                messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                          mine ? "bg-primary text-primary-foreground" : "bg-card text-foreground border border-border"
                        }`}
                      >
                        {m.image_url ? (
                          <a href={m.image_url} target="_blank" rel="noreferrer">
                            <img src={m.image_url} alt="attachment" className="mb-1 max-h-64 rounded-lg object-cover" />
                          </a>
                        ) : null}
                        {m.content ? <p className="whitespace-pre-wrap break-words">{m.content}</p> : null}
                        <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-border bg-card p-3">
              {filePreview && (
                <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-1 pr-2">
                  <img src={filePreview} alt="preview" className="h-12 w-12 rounded object-cover" />
                  <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
                  <ImageIcon className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <textarea
                  rows={1}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a message…"
                  className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <Button onClick={handleSend} disabled={sending || (!text.trim() && !file)} className="h-10">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation to start chatting.
          </div>
        )}
      </section>
    </div>
  );
};

export default MentorChatPanel;
