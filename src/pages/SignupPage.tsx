import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Flame, Mail, Eye, EyeOff, Phone, User, MapPin, Check, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

const SignupPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    countryCode: "+91",
    phone: "",
    email: "",
    password: "",
    target_exam: "IIT JEE",
    class_level: "Class 11",
    city: "",
    country: "India",
  });

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSignup = async () => {
    if (!form.full_name || !form.email || !form.password) {
      toast.error("Name, email and password are required");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setSubmitting(true);
    const redirectUrl = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: form.full_name,
          phone: `${form.countryCode}${form.phone}`,
          target_exam: form.target_exam,
          class_level: form.class_level,
          city: form.city,
          country: form.country,
        },
      },
    });

    setSubmitting(false);

    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        toast.error("An account with this email already exists. Please log in.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success("Verification email sent! Check your inbox.");
    navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel */}
      <div className="hidden w-[60%] grid-texture p-12 lg:flex lg:flex-col lg:justify-center" style={{ background: "linear-gradient(135deg, hsl(222 47% 11%) 0%, hsl(222 47% 18%) 50%, hsl(222 47% 15%) 100%)" }}>
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Flame className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-display text-white">ARKE</h1>
              <p className="text-sm text-white/85">Start Now, Reach Your Destination</p>
            </div>
          </div>
          <div className="space-y-5 mt-12">
            {["Live classes from top educators", "JEE/NEET test series with rank", "AI doubt solver — available 24/7"].map((t) => (
              <div key={t} className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/30">
                  <Check className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-white">{t}</span>
              </div>
            ))}
          </div>
          <p className="mt-12 text-sm text-white/85">Join 50,000+ students already learning</p>
          <Sparkles className="mt-8 h-6 w-6 text-accent animate-pulse" />
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex flex-1 items-center justify-center bg-card p-8 overflow-y-auto">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-black font-display text-foreground">Create Account</h2>
          <p className="mt-1 text-sm text-muted-foreground">Start your preparation journey</p>

          <div className="mt-6 space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} type="text" placeholder="Enter your name" className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Phone Number</label>
              <div className="mt-1 flex gap-2">
                <select value={form.countryCode} onChange={(e) => update("countryCode", e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground">
                  <option value="+91">IN +91</option>
                  <option value="+971">AE +971</option>
                </select>
                <input value={form.phone} onChange={(e) => update("phone", e.target.value)} type="tel" placeholder="Phone number" className="flex-1 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input value={form.email} onChange={(e) => update("email", e.target.value)} type="email" placeholder="you@example.com" className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative mt-1">
                <input value={form.password} onChange={(e) => update("password", e.target.value)} type={showPassword ? "text" : "password"} placeholder="Min 8 characters" className="w-full rounded-lg border border-border bg-card py-2.5 px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Target Exam</label>
                <select value={form.target_exam} onChange={(e) => update("target_exam", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground">
                  <option>IIT JEE</option>
                  <option>NEET</option>
                  <option>Boards</option>
                  <option>JEE + NEET</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Class</label>
                <select value={form.class_level} onChange={(e) => update("class_level", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground">
                  <option>Class 11</option>
                  <option>Class 12</option>
                  <option>Dropper</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">City</label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input value={form.city} onChange={(e) => update("city", e.target.value)} type="text" placeholder="City" className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Country</label>
                <select value={form.country} onChange={(e) => update("country", e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground">
                  <option>India</option>
                  <option>UAE</option>
                </select>
              </div>
            </div>
            <button onClick={handleSignup} disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-accent py-3 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-60 transition-opacity">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating Account...</> : "Create Account"}
            </button>
          </div>

          <div className="mt-4 text-center">
            <span className="text-sm text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="text-sm font-semibold text-primary hover:text-primary-dark">Login →</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
