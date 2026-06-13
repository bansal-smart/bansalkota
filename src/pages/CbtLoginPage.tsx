import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Monitor } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const CbtLoginPage = () => {
  const navigate = useNavigate();
  const [roll, setRoll] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = roll.trim();
    const p = phone.trim();
    if (!/^\d{4,}$/.test(r)) return toast.error("Enter your roll number (registration no).");
    if (!/^\d{10}$/.test(p)) return toast.error("Enter your 10-digit mobile number.");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("cbt-login", {
        body: { roll_number: r, phone: p },
      });
      if (error) throw error;
      const payload = data as {
        success: boolean;
        error?: string;
        session?: { access_token: string; refresh_token: string };
      };
      if (!payload?.success || !payload.session) throw new Error(payload?.error ?? "Login failed");
      const { error: sErr } = await supabase.auth.setSession({
        access_token: payload.session.access_token,
        refresh_token: payload.session.refresh_token,
      });
      if (sErr) throw sErr;
      toast.success("Welcome!");
      navigate("/cbt/tests", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card shadow-xl overflow-hidden">
        <div className="bg-primary/10 px-6 py-6 border-b border-border">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> CBT Kiosk · Bansal Classes
          </div>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Sign in to your test</h1>
          <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
            <Monitor className="h-3 w-3" /> Use your registration number and registered mobile.
          </p>
        </div>

        <form className="px-6 py-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="text-xs font-semibold text-foreground">Roll Number (Registration No.)</label>
            <input
              type="text"
              inputMode="numeric"
              value={roll}
              onChange={(e) => setRoll(e.target.value)}
              autoFocus
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="e.g. 261059"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground">Mobile Number</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="10-digit mobile"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Continue
          </button>

          <p className="text-[10px] text-muted-foreground text-center pt-2">
            By signing in, you agree to follow the test rules set by your invigilator.
          </p>
        </form>
      </div>
    </div>
  );
};

export default CbtLoginPage;
