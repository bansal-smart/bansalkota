import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Sparkles, Flame, Hash, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BansalLogo from "@/components/bansal/BansalLogo";

const CbtLoginPage = () => {
  const navigate = useNavigate();
  const [roll, setRoll] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = roll.trim();
    const pwd = password;
    if (!/^\d{2,}$/.test(r)) return toast.error("Enter your roll number (registration no).");
    if (!pwd || pwd.length < 4) return toast.error("Enter your password.");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("cbt-login", {
        body: { roll_number: r, password: pwd },
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
      toast.success("Welcome, Beta! Best of luck.");
      navigate("/cbt/tests", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left: branded blessing panel */}
      <div
        className="relative lg:w-[55%] flex flex-col justify-between p-8 lg:p-12 text-white overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(var(--bansal-blue-dark)) 0%, hsl(var(--bansal-blue)) 60%, #0b1f3d 100%)" }}
      >
        {/* decorative accents */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-bansal-orange/30 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-bansal-orange/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <BansalLogo className="h-12 w-auto" variant="white" />
        </div>

        <div className="relative max-w-lg animate-fade-in-up py-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-bansal-orange/20 border border-bansal-orange/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-bansal-orange">
            <Flame className="h-3.5 w-3.5" /> CBT Test Kiosk
          </div>
          <h1 className="mt-5 font-display text-4xl md:text-5xl font-black leading-tight">
            Best of luck, <span className="text-bansal-orange">Beta!</span>
          </h1>
          <p className="mt-5 text-lg text-white/90 leading-relaxed">
            The blessings of the entire <b className="text-white">Bansal family</b> are with you today.
            Walk in confident, write with focus, and make Kota proud.
          </p>
          <div className="mt-6 flex items-center gap-3 text-sm text-white/70">
            <Sparkles className="h-4 w-4 text-bansal-orange" />
            <span className="italic">"Believe in yourself and strive for excellence."</span>
          </div>
          <p className="mt-1 ml-7 text-xs text-white/60">— Late Shri Bansal Sir, Founder</p>
        </div>

        <div className="relative flex items-center justify-between text-xs text-white/60">
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Secure exam environment</span>
          <span>Bansal Classes · Kota, Rajasthan</span>
        </div>
      </div>

      {/* Right: sign-in form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 bg-gradient-to-br from-white via-orange-50/40 to-white">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border-2 border-border bg-white shadow-xl overflow-hidden">
            <div className="px-7 pt-7 pb-2">
              <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-bansal-blue">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure Sign-In
              </div>
              <h2 className="mt-2 font-display text-2xl font-black text-bansal-black">
                Sign in to your test
              </h2>
              <p className="mt-1 text-sm text-bansal-gray">
                Use your <b>registration number</b> and <b>registered mobile</b>.
              </p>
            </div>

            <form className="px-7 pb-7 pt-5 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-xs font-bold text-bansal-black uppercase tracking-wide">Roll Number</label>
                <div className="mt-1.5 flex items-stretch rounded-lg border-2 border-border focus-within:border-bansal-blue overflow-hidden transition-colors">
                  <div className="flex items-center justify-center px-3 bg-bansal-gray-light border-r border-border">
                    <Hash className="h-4 w-4 text-bansal-gray" />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={roll}
                    onChange={(e) => setRoll(e.target.value)}
                    autoFocus
                    className="flex-1 px-3 py-3 text-sm font-semibold text-bansal-black placeholder:text-bansal-gray/70 outline-none"
                    placeholder="e.g. 261059"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-bansal-black uppercase tracking-wide">Password</label>
                <div className="mt-1.5 flex items-stretch rounded-lg border-2 border-border focus-within:border-bansal-blue overflow-hidden transition-colors">
                  <div className="flex items-center justify-center px-3 bg-bansal-gray-light border-r border-border">
                    <Lock className="h-4 w-4 text-bansal-gray" />
                  </div>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 px-3 py-3 text-sm font-semibold text-bansal-black placeholder:text-bansal-gray/70 outline-none"
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="px-3 text-bansal-gray hover:text-bansal-black"
                    aria-label={showPwd ? "Hide password" : "Show password"}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-bansal-gray">Forgot your password? Please contact your centre.</p>
              </div>


              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-bansal-orange to-[#E86511] hover:from-[#E86511] hover:to-bansal-orange px-4 py-3 text-sm font-black text-white uppercase tracking-wider shadow-lg shadow-bansal-orange/30 disabled:opacity-60 transition-all"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
                {submitting ? "Signing in…" : "Begin My Test"}
              </button>

              <p className="text-[11px] text-bansal-gray text-center pt-2 leading-relaxed">
                By signing in, you agree to follow the test rules set by your invigilator.
                Tab switching is monitored.
              </p>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-bansal-gray">
            Trouble logging in? Speak to your <b className="text-bansal-black">centre invigilator</b>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CbtLoginPage;
