import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const CbtSubmittedPage = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(async () => {
      await supabase.auth.signOut();
      navigate("/cbt", { replace: true });
    }, 5000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-foreground">Submitted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your responses have been recorded. Results will be released by your centre.
        </p>
        <p className="mt-6 text-[11px] text-muted-foreground">Returning to login…</p>
      </div>
    </div>
  );
};

export default CbtSubmittedPage;
