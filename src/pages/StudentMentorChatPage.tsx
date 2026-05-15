import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import MentorChatPanel from "@/components/MentorChatPanel";
import { Button } from "@/components/ui/button";
import { useStudentMentorConversations } from "@/hooks/useMentorChat";

const StudentMentorChatPage = () => {
  const { conversations, loading, refresh } = useStudentMentorConversations();
  return (
    <div className="flex h-full min-h-0 flex-col p-4 lg:p-6">
      <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black text-foreground">Mentor Chat</h1>
          <p className="text-sm text-muted-foreground">
            Talk to your assigned mentor and your mentor group.
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to="/dashboard">
            <Star className="h-4 w-4" />
            Rate your mentor
          </Link>
        </Button>
      </div>
      <MentorChatPanel
        conversations={conversations}
        loading={loading}
        onActivity={refresh}
        emptyHint="You haven't been assigned a mentor yet. Once you are, the chat will open up here."
      />
    </div>
  );
};

export default StudentMentorChatPage;
