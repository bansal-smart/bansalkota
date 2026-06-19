import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const REASONS = [
  "Wrong question",
  "Wrong/multiple correct answer",
  "Image not loading",
  "Typo or formatting issue",
  "Out of syllabus",
  "Other",
];

interface Props {
  testId: string;
  questionId: string;
  attemptId?: string | null;
  questionNumber?: number;
}

export function ReportQuestionButton({ testId, questionId, attemptId, questionNumber }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const { error } = await (supabase as any).from("test_question_reports").insert({
      test_id: testId,
      question_id: questionId,
      attempt_id: attemptId ?? null,
      reason,
      details: details.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Could not submit report. " + error.message);
      return;
    }
    toast.success("Report submitted. Our team will review it.");
    setOpen(false);
    setDetails("");
    setReason(REASONS[0]);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded border border-neutral-300 bg-white px-2 py-1 text-[10px] font-semibold text-neutral-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
      >
        <Flag className="h-3 w-3" /> Report
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Report Question{typeof questionNumber === "number" ? ` #${questionNumber}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <RadioGroup value={reason} onValueChange={setReason}>
              {REASONS.map((r) => (
                <div key={r} className="flex items-center gap-2">
                  <RadioGroupItem value={r} id={`reason-${r}`} />
                  <Label htmlFor={`reason-${r}`} className="text-sm cursor-pointer">{r}</Label>
                </div>
              ))}
            </RadioGroup>
            <div>
              <Label htmlFor="report-details" className="text-xs text-neutral-600">Additional details (optional)</Label>
              <Textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="What looks wrong?"
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ReportQuestionButton;
