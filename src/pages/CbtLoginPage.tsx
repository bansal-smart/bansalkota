import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type CbtTestMeta = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
};

const CbtLoginPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [test, setTest] = useState<CbtTestMeta | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [roll, setRoll] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        setLoadErr("Missing CBT token");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("cbt_test_by_token", { _token: token });
      if (!active) return;
      if (error) {
        setLoadErr(error.message);
      } else {
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) setLoadErr("This CBT link is invalid or has been disabled.");
        else setTest(row as CbtTestMeta);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const rNorm = roll.trim();
    const pNorm = phone.trim();
    if (!/^\d{4,}$/.test(rNorm)) return toast.error("Enter your roll number (registration no).");
    if (!/^\d{10}$/.test(pNorm)) return toast.error("Enter your 10-digit mobile number.");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("cbt-login", {
        body: { token, roll_number: rNorm, phone: pNorm },
      });
      if (error) throw error;
      const payload = data as { success: boolean; error?: string; session?: { access_token: string; refresh_token: string }; test?: { slug_url: string } };
      if (!payload?.success || !payload.session) {
        throw new Error(payload?.error ?? "Login failed");
      }
      const { error: sErr } = await supabase.auth.setSession({
        access_token: payload.session.access_token,
        refresh_token: payload.session.refresh_token,
      });
      if (sErr) throw sErr;
      toast.success("Welcome! Loading your test…");
      navigate(payload.test!.slug_url, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (loadErr || !test) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-lg font-bold text-destructive">CBT link unavailable</p>
          <p className="mt-2 text-sm text-muted-foreground">{loadErr ?? "Please contact your centre."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card shadow-xl overflow-hidden">
        <div className="bg-primary/10 px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> CBT · Bansal Classes
          </div>
          <h1 className="mt-1 text-xl font-bold text-foreground">{test.title}</h1>
          {test.description && <p className="mt-1 text-xs text-muted-foreground">{test.description}</p>}
          <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {test.duration_minutes} min</span>
            <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" /> {test.total_questions} questions · {test.total_marks} marks</span>
          </div>
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
            <p className="mt-1 text-[10px] text-muted-foreground">Use the mobile number registered with your centre.</p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Start Test
          </button>

          <p className="text-[10px] text-muted-foreground text-center pt-2">
            By starting, you confirm the device, time, and that you will follow the test rules set by the invigilator.
          </p>
        </form>
      </div>
    </div>
  );
};

export default CbtLoginPage;
