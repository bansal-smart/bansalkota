import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type MentorMessage = {
  id: string;
  conversation_type: "direct" | "group";
  group_id: string | null;
  sender_id: string;
  recipient_id: string | null;
  content: string | null;
  image_url: string | null;
  is_deleted: boolean;
  created_at: string;
};

export type Conversation =
  | { kind: "direct"; id: string; title: string; subtitle?: string; peerId: string }
  | { kind: "group"; id: string; title: string; subtitle?: string; groupId: string };

/** Mentor-side: list of student DMs + the mentor's own group. */
export const useMentorConversations = () => {
  const { user } = useAuth();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    (async () => {
      setLoading(true);
      const [{ data: assignments }, { data: groups }] = await Promise.all([
        supabase
          .from("mentor_student_assignments")
          .select("student_id")
          .eq("mentor_id", user.id)
          .is("removed_at", null),
        supabase.from("mentor_groups").select("id, name").eq("mentor_id", user.id),
      ]);

      const studentIds = (assignments ?? []).map((a) => a.student_id);
      const { data: profiles } = studentIds.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", studentIds)
        : { data: [] as { user_id: string; full_name: string | null }[] };

      const list: Conversation[] = [];
      (groups ?? []).forEach((g) =>
        list.push({ kind: "group", id: `g:${g.id}`, title: g.name, subtitle: "Group chat", groupId: g.id }),
      );
      (profiles ?? []).forEach((p) =>
        list.push({
          kind: "direct",
          id: `d:${p.user_id}`,
          title: p.full_name || "Student",
          subtitle: "Direct message",
          peerId: p.user_id,
        }),
      );
      if (!ignore) {
        setConvos(list);
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [user]);

  return { conversations: convos, loading };
};

/** Student-side: their assigned mentor DM + the mentor's group. */
export const useStudentMentorConversations = () => {
  const { user } = useAuth();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    (async () => {
      setLoading(true);
      const { data: assignment } = await supabase
        .from("mentor_student_assignments")
        .select("mentor_id")
        .eq("student_id", user.id)
        .is("removed_at", null)
        .maybeSingle();

      const list: Conversation[] = [];
      if (assignment?.mentor_id) {
        const [{ data: mentorProfile }, { data: group }] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("user_id", assignment.mentor_id).maybeSingle(),
          supabase.from("mentor_groups").select("id, name").eq("mentor_id", assignment.mentor_id).maybeSingle(),
        ]);
        list.push({
          kind: "direct",
          id: `d:${assignment.mentor_id}`,
          title: mentorProfile?.full_name || "Your Mentor",
          subtitle: "Direct message",
          peerId: assignment.mentor_id,
        });
        if (group) {
          list.push({ kind: "group", id: `g:${group.id}`, title: group.name, subtitle: "Group chat", groupId: group.id });
        }
      }
      if (!ignore) {
        setConvos(list);
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [user]);

  return { conversations: convos, loading };
};

export const useMentorMessages = (conversation: Conversation | null) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const matchesConvo = useCallback(
    (m: MentorMessage) => {
      if (!conversation || !user) return false;
      if (conversation.kind === "group") return m.conversation_type === "group" && m.group_id === conversation.groupId;
      const peer = conversation.peerId;
      return (
        m.conversation_type === "direct" &&
        ((m.sender_id === user.id && m.recipient_id === peer) || (m.sender_id === peer && m.recipient_id === user.id))
      );
    },
    [conversation, user],
  );

  useEffect(() => {
    if (!conversation || !user) {
      setMessages([]);
      return;
    }
    let ignore = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("mentor_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      if (conversation.kind === "group") {
        q = q.eq("conversation_type", "group").eq("group_id", conversation.groupId);
      } else {
        q = q
          .eq("conversation_type", "direct")
          .or(
            `and(sender_id.eq.${user.id},recipient_id.eq.${conversation.peerId}),and(sender_id.eq.${conversation.peerId},recipient_id.eq.${user.id})`,
          );
      }
      const { data } = await q;
      if (!ignore) {
        setMessages((data ?? []) as MentorMessage[]);
        setLoading(false);
      }
    })();

    // Realtime
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    const ch = supabase
      .channel(`mentor-msgs:${conversation.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mentor_messages" },
        (payload) => {
          const row = payload.new as MentorMessage;
          if (matchesConvo(row)) {
            setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mentor_messages" },
        (payload) => {
          const row = payload.new as MentorMessage;
          setMessages((prev) => prev.map((m) => (m.id === row.id ? row : m)));
        },
      )
      .subscribe();
    channelRef.current = ch;

    return () => {
      ignore = true;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [conversation, user, matchesConvo]);

  const send = useCallback(
    async (opts: { text?: string; file?: File | null }) => {
      if (!conversation || !user) return;
      const text = opts.text?.trim() || "";
      const file = opts.file ?? null;
      if (!text && !file) return;
      setSending(true);
      try {
        let imageUrl: string | null = null;
        if (file) {
          const ext = file.name.split(".").pop() || "jpg";
          const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("mentor-chat-images")
            .upload(path, file, { contentType: file.type, upsert: false });
          if (upErr) throw upErr;
          const { data: signed } = await supabase.storage
            .from("mentor-chat-images")
            .createSignedUrl(path, 60 * 60 * 24 * 365);
          imageUrl = signed?.signedUrl ?? null;
        }
        const row = {
          conversation_type: conversation.kind,
          group_id: conversation.kind === "group" ? conversation.groupId : null,
          sender_id: user.id,
          recipient_id: conversation.kind === "direct" ? conversation.peerId : null,
          content: text || null,
          image_url: imageUrl,
        };
        const { error } = await supabase.from("mentor_messages").insert(row);
        if (error) throw error;
      } finally {
        setSending(false);
      }
    },
    [conversation, user],
  );

  return useMemo(() => ({ messages, loading, sending, send }), [messages, loading, sending, send]);
};
