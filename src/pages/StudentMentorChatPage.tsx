import MentorChatPanel from "@/components/MentorChatPanel";
import { useStudentMentorConversations } from "@/hooks/useMentorChat";

const StudentMentorChatPage = () => {
  const { conversations, loading } = useStudentMentorConversations();
  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-black text-foreground">Mentor Chat</h1>
        <p className="text-sm text-muted-foreground">
          Talk to your assigned mentor and your mentor group.
        </p>
      </div>
      <MentorChatPanel
        conversations={conversations}
        loading={loading}
        emptyHint="You haven't been assigned a mentor yet. Once you are, the chat will open up here."
      />
    </div>
  );
};

export default StudentMentorChatPage;
