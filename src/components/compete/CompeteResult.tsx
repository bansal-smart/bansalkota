import { Crown, RotateCw, Home, TrendingUp, TrendingDown } from "lucide-react";
import { CompeteMatch } from "@/hooks/useCompeteMatch";
import { useAuth } from "@/context/AuthContext";

type Props = {
  match: CompeteMatch;
  onPlayAgain: () => void;
  onLobby: () => void;
};

const CompeteResult = ({ match, onPlayAgain, onLobby }: Props) => {
  const { user } = useAuth();
  const isP1 = user?.id === match.player1_id;
  const myScore = isP1 ? match.player1_score : match.player2_score;
  const oppScore = isP1 ? match.player2_score : match.player1_score;
  const myBefore = isP1 ? match.player1_rating_before : match.player2_rating_before;
  const myAfter = isP1 ? match.player1_rating_after : match.player2_rating_after;
  const myName = isP1 ? match.player1_name : match.player2_name;
  const oppName = isP1 ? (match.player2_name || (match.is_bot ? "Practice Bot" : "Opponent")) : match.player1_name;

  const won = match.winner_id && match.winner_id === user?.id;
  const draw = match.winner_id === null;
  const delta = (myAfter ?? 0) - (myBefore ?? 0);
  const title = draw ? "Draw!" : won ? "Victory!" : "Defeated";
  const titleColor = draw ? "text-white" : won ? "text-accent" : "text-destructive";

  return (
    <div className="space-y-5 max-w-md mx-auto py-8 text-center animate-fade-in-up">
      <Crown className={`h-12 w-12 mx-auto ${won ? "text-accent" : "text-white/30"}`} />
      <h2 className={`text-3xl font-black font-display ${titleColor}`}>{title}</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-xl border-2 p-4 ${won ? "border-accent bg-accent/10" : "border-white/10 bg-white/5"}`}>
          <p className="text-xs font-bold text-white/60 truncate">{myName}</p>
          <p className="text-3xl font-black text-white mt-1">{Math.round(myScore)}</p>
        </div>
        <div className={`rounded-xl border-2 p-4 ${!won && !draw ? "border-destructive bg-destructive/10" : "border-white/10 bg-white/5"}`}>
          <p className="text-xs font-bold text-white/60 truncate">{oppName}</p>
          <p className="text-3xl font-black text-white mt-1">{Math.round(oppScore)}</p>
        </div>
      </div>

      {!match.is_bot && myAfter != null && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-3 inline-flex items-center gap-2 text-sm">
          {delta >= 0 ? <TrendingUp className="h-4 w-4 text-secondary" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          <span className="text-white/70">Rating</span>
          <span className="font-black text-white">{myBefore}</span>
          <span className="text-white/40">→</span>
          <span className="font-black text-white">{myAfter}</span>
          <span className={`font-bold ${delta >= 0 ? "text-secondary" : "text-destructive"}`}>({delta >= 0 ? "+" : ""}{delta})</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onPlayAgain} className="rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-3 text-sm font-black text-primary-foreground hover:opacity-90">
          <RotateCw className="h-4 w-4 inline mr-1" /> Play Again
        </button>
        <button onClick={onLobby} className="rounded-lg bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15">
          <Home className="h-4 w-4 inline mr-1" /> Lobby
        </button>
      </div>
    </div>
  );
};

export default CompeteResult;
