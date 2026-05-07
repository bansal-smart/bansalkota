import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CompeteLobby from "@/components/compete/CompeteLobby";
import CompeteSearching from "@/components/compete/CompeteSearching";
import CompeteMatchView from "@/components/compete/CompeteMatch";
import CompeteResult from "@/components/compete/CompeteResult";
import { useCompeteRating } from "@/hooks/useCompeteRating";
import { useCompeteMatch } from "@/hooks/useCompeteMatch";
import { useAuth } from "@/context/AuthContext";

type Phase = "lobby" | "searching" | "match" | "result";

const CompetePage = () => {
  const { user } = useAuth();
  const { rating, refresh } = useCompeteRating();
  const [phase, setPhase] = useState<Phase>("lobby");
  const [subject, setSubject] = useState("Physics");
  const [topic, setTopic] = useState("Any");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const pollTimer = useRef<number | null>(null);

  const { match, questions, answers } = useCompeteMatch(matchId);

  // Auto-advance phase based on match status
  useEffect(() => {
    if (!match) return;
    if (match.status === "active" && phase !== "match") setPhase("match");
    if (match.status === "finished" && phase !== "result") {
      setPhase("result");
      refresh();
    }
  }, [match?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll matchmaking
  const startPolling = () => {
    stopPolling();
    pollTimer.current = window.setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("compete-matchmake", { body: { action: "poll" } });
        if (data?.status === "matched" && data.match_id) {
          setMatchId(data.match_id);
          stopPolling();
        }
      } catch { /* ignore */ }
    }, 3000);
  };
  const stopPolling = () => {
    if (pollTimer.current) { clearInterval(pollTimer.current); pollTimer.current = null; }
  };
  useEffect(() => () => stopPolling(), []);

  // Realtime: when private room gets a player2, status flips active
  useEffect(() => {
    if (!matchId || !roomCode) return;
    if (match?.status === "active") setRoomCode(null);
  }, [match?.status, matchId, roomCode]);

  const handleQuickMatch = async () => {
    if (!user) return toast.error("Please sign in");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("compete-matchmake", {
        body: { action: "find", subject, topic },
      });
      if (error) throw error;
      if (data.status === "matched") {
        setMatchId(data.match_id);
        setPhase("searching"); // will flip to match via match.status
      } else {
        setPhase("searching");
        startPolling();
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to start match");
    } finally { setBusy(false); }
  };

  const handleCreateRoom = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("compete-create-room", {
        body: { subject, topic },
      });
      if (error) throw error;
      setMatchId(data.match_id);
      setRoomCode(data.room_code);
      setPhase("searching");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create room");
    } finally { setBusy(false); }
  };

  const handleJoinRoom = async (code: string) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("compete-join-room", {
        body: { room_code: code },
      });
      if (error) throw error;
      setMatchId(data.match_id);
      setPhase("match");
    } catch (e: any) {
      toast.error(e?.message || "Failed to join room");
    } finally { setBusy(false); }
  };

  const handlePracticeBot = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("compete-matchmake", {
        body: { action: "bot", subject, topic },
      });
      if (error) throw error;
      setMatchId(data.match_id);
      setPhase("match");
    } catch (e: any) {
      toast.error(e?.message || "Failed to start bot match");
    } finally { setBusy(false); }
  };

  const handleCancel = async () => {
    stopPolling();
    try { await supabase.functions.invoke("compete-matchmake", { body: { action: "cancel" } }); } catch {}
    setMatchId(null);
    setRoomCode(null);
    setJoinCode("");
    setPhase("lobby");
  };

  const handleBotFallback = async () => {
    stopPolling();
    await handlePracticeBot();
  };

  const handlePlayAgain = () => {
    setMatchId(null);
    setRoomCode(null);
    setPhase("lobby");
  };

  return (
    <div className="pb-20 lg:pb-0 min-h-[calc(100vh-57px)]" style={{ background: "hsl(var(--navy))" }}>
      <div className="grid-texture p-4 lg:p-6">
        {phase === "lobby" && (
          <CompeteLobby
            rating={rating}
            subject={subject} topic={topic}
            onSubject={setSubject} onTopic={setTopic}
            onQuickMatch={handleQuickMatch}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onPracticeBot={handlePracticeBot}
            joinCode={joinCode} onJoinCodeChange={setJoinCode}
            busy={busy}
          />
        )}
        {phase === "searching" && (
          <CompeteSearching
            roomCode={roomCode}
            onCancel={handleCancel}
            onBotFallback={handleBotFallback}
          />
        )}
        {phase === "match" && match && (
          <CompeteMatchView match={match} questions={questions} answers={answers} />
        )}
        {phase === "result" && match && (
          <CompeteResult match={match} onPlayAgain={handlePlayAgain} onLobby={handlePlayAgain} />
        )}
      </div>
    </div>
  );
};

export default CompetePage;
