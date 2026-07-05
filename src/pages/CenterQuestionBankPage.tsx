import { Library } from "lucide-react";
import QuestionBankPanel from "@/components/QuestionBankPanel";
import { useCenterAdmin } from "@/hooks/useCenterAdmin";

const CenterQuestionBankPage = () => {
  const { primaryCenterId, loading: centerLoading } = useCenterAdmin();

  if (centerLoading) return <div className="p-8 text-sm text-muted-foreground">Loading centre…</div>;
  if (!primaryCenterId) return <div className="p-8 text-sm text-muted-foreground">No centre assigned.</div>;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2">
          <Library className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Question Bank</h1>
          <p className="text-xs text-muted-foreground">
            Author and manage your centre's own questions, separate from Bansal's question bank.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden h-[calc(100vh-180px)]">
        <QuestionBankPanel manage tableView centreId={primaryCenterId} />
      </div>
    </div>
  );
};

export default CenterQuestionBankPage;
