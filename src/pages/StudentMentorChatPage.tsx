import { useState } from "react";
import { Star } from "lucide-react";
import MentorChatPanel from "@/components/MentorChatPanel";
import MentorReviewCard from "@/components/MentorReviewCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStudentMentorConversations } from "@/hooks/useMentorChat";

const StudentMentorChatPage = () => {
  const { conversations, loading, refresh } = useStudentMentorConversations();
  const [rateOpen, setRateOpen] = useState(false);
  return (
    <div className="flex h-full min-h-0 flex-col p-4 lg:p-6">
      <div className="mb-4 flex shrink-0 items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black text-foreground">Mentor Chat</h1>
          <p className="text-sm text-muted-foreground">
            Talk to your assigned mentor and your mentor group.
          </p>
        </div>
        <Button size="sm" className="shrink-0" onClick={() => setRateOpen(true)}>
          <Star className="h-4 w-4" />
          Rate your mentor
        </Button>
      </div>
      <Dialog open={rateOpen} onOpenChange={setRateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rate your mentor</DialogTitle>
          </DialogHeader>
          <MentorReviewCard />
        </DialogContent>
      </Dialog>
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
