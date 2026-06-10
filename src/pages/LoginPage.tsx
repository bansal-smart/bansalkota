import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Phone, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import BansalLogo from "@/components/bansal/BansalLogo";
import BansalButton from "@/components/bansal/BansalButton";

type Step = "phone" | "otp" | "name";

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const { session, user, isStaff, isTeacher, isMentor, isCenterAdmin, roleReady, loading } = useAuth();

  useEffect(() => {
    if (loading || !session || !roleReady) return;
    if (isStaff) return navigate("/admin/dashboard", { replace: true });
    if (isTeacher) return navigate("/teacher/dashboard", { replace: true });
    if (isMentor) return navigate("/mentor/dashboard", { replace: true });
    if (isCenterAdmin) return navigate("/center", { replace: true });
    // If profile is missing a name, ask for it once.
    if (!user?.user_metadata?.full_name && !user?.user_metadata?.name) {
      setStep("name");
      return;
    }
    navigate(redirectTo || "/dashboard", { replace: true });
  }, [loading, session, user, roleReady, isStaff, isTeacher, isMentor, isCenterAdmin, navigate, redirectTo]);

  const [step, setStep] = useState<Step>("phone");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const timerRef = useRef<number | null>(null);

  const startTimer = () => {
    setResendIn(60);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) window.clearInterval(timerRef.current); }, []);

  const sendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      toast.error("Enter a valid 10-digit Indian mobile number");
      return;
    }
    setSubmitting(true);
    // Mock: pretend we sent it
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    setStep("otp");
    startTimer();
    toast.success("OTP sent. (Dev: any 6 digits work)");
  };

  const handleOtpChange = (i: number, v: string) => {
    if (v.length > 1) return;
    const next = [...otp];
    next[i] = v.replace(/\D/g, "");
    setOtp(next);
    if (v && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      toast.error("Enter the 6-digit OTP");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("mobile-otp-mock", {
        body: { mobile: `+91${mobile}`, otp: code },
      });
      if (error || !data?.email || !data?.password) {
        throw new Error(error?.message || "Could not verify OTP");
      }
      const signIn = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (signIn.error) throw signIn.error;
      toast.success("Logged in!");
      // Redirect handled by useEffect when session settles.
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const saveName = async () => {
    if (name.trim().length < 2) {
      toast.error("Please enter your full name");
      return;
    }
    setSubmitting(true);
    const { error: metaErr } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    if (!metaErr && user?.id) {
      await supabase.from("profiles").update({ full_name: name.trim() }).eq("user_id", user.id);
    }
    setSubmitting(false);
    navigate(redirectTo || "/dashboard", { replace: true });
  };

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div
        className="hidden lg:flex w-[55%] flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(var(--bansal-blue-dark)) 0%, hsl(var(--bansal-blue)) 100%)" }}
      >
        <div className="absolute inset-0 grid-texture opacity-40" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-bansal-orange/20 blur-3xl" />

        <div className="relative">
          <BansalLogo className="h-14 w-auto" variant="white" />
        </div>

        <div className="relative max-w-md animate-fade-in-up">
          <Sparkles className="h-8 w-8 text-bansal-orange mb-4" />
          <p className="font-display text-3xl md:text-4xl font-bold leading-tight">
            "Believe in yourself and strive for excellence with unwavering dedication."
          </p>
          <p className="font-accent mt-5 text-white/85">— Late Shri V.K. Bansal, Founder</p>
        </div>

        <div className="relative font-accent text-white/80 text-sm">
          Ideal for Scholars · Kota, Rajasthan
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center bg-white p-6">
        <div className="w-full max-w-sm animate-fade-in-up">
          <Link to="/" className="inline-flex items-center gap-1.5 mb-6 text-sm font-medium text-bansal-gray hover:text-bansal-blue">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>

          <div className="lg:hidden mb-6">
            <BansalLogo className="h-10 w-auto" />
          </div>

          {step === "phone" && (
            <>
              <h2 className="font-display text-3xl font-extrabold text-bansal-black">Welcome</h2>
              <p className="mt-1 text-sm text-bansal-gray">Login with your mobile number to continue.</p>

              <div className="mt-8">
                <label className="text-sm font-semibold text-bansal-black">Mobile Number</label>
                <div className="mt-2 flex items-stretch rounded-lg border-2 border-border focus-within:border-bansal-blue overflow-hidden">
                  <div className="px-3 flex items-center bg-bansal-gray-light text-sm font-semibold text-bansal-black border-r border-border">
                    +91
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit mobile"
                    className="flex-1 px-3 py-3 text-sm text-bansal-black placeholder:text-bansal-gray outline-none"
                  />
                </div>
              </div>

              <BansalButton variant="primary" onClick={sendOtp} disabled={submitting} className="w-full mt-6">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending OTP...</> : <><Phone className="h-4 w-4" /> Send OTP</>}
              </BansalButton>

              <p className="mt-4 text-xs text-bansal-gray text-center">
                By continuing you agree to our <Link to="/terms" className="text-bansal-blue font-semibold">Terms</Link> &amp; <Link to="/privacy" className="text-bansal-blue font-semibold">Privacy Policy</Link>.
              </p>
            </>
          )}

          {step === "otp" && (
            <>
              <h2 className="font-display text-3xl font-extrabold text-bansal-black">Verify OTP</h2>
              <p className="mt-1 text-sm text-bansal-gray">
                We sent a 6-digit code to <span className="font-semibold text-bansal-black">+91 {mobile}</span>.
              </p>

              <div className="mt-8 flex gap-2 justify-between">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    className="h-14 w-12 rounded-lg border-2 border-border bg-white text-center font-display text-xl font-bold text-bansal-black focus:border-bansal-blue outline-none"
                  />
                ))}
              </div>

              <div className="mt-3 text-xs text-bansal-gray">
                {resendIn > 0 ? (
                  <>Resend OTP in <span className="font-semibold text-bansal-black">{resendIn}s</span></>
                ) : (
                  <button onClick={sendOtp} className="font-semibold text-bansal-blue hover:text-bansal-orange">Resend OTP</button>
                )}
              </div>

              <BansalButton variant="cta" onClick={verifyOtp} disabled={submitting} className="w-full mt-6">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</> : "Verify & Continue"}
              </BansalButton>

              <button
                onClick={() => { setStep("phone"); setOtp(["", "", "", "", "", ""]); }}
                className="w-full mt-3 text-xs text-bansal-gray hover:text-bansal-blue"
              >
                Change mobile number
              </button>
            </>
          )}

          {step === "name" && (
            <>
              <h2 className="font-display text-3xl font-extrabold text-bansal-black">Welcome aboard!</h2>
              <p className="mt-1 text-sm text-bansal-gray">Tell us your name so we can personalise your dashboard.</p>

              <div className="mt-8">
                <label className="text-sm font-semibold text-bansal-black">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  className="mt-2 w-full rounded-lg border-2 border-border bg-white px-3 py-3 text-sm text-bansal-black placeholder:text-bansal-gray focus:border-bansal-blue outline-none"
                />
              </div>

              <BansalButton variant="primary" onClick={saveName} disabled={submitting} className="w-full mt-6">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
              </BansalButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
