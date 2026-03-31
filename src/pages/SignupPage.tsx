import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Flame, Mail, Eye, EyeOff, Phone, User, MapPin, Check, Sparkles } from "lucide-react";

const SignupPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Left Panel */}
      <div className="hidden w-[60%] bg-gradient-to-br from-[hsl(var(--navy))] via-[hsl(var(--navy2))] to-[hsl(222,47%,15%)] grid-texture p-12 lg:flex lg:flex-col lg:justify-center">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Flame className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-display text-white">ARAMBH CLASSES</h1>
              <p className="text-sm text-white/60">Start Now, Reach Your Destination</p>
            </div>
          </div>
          <div className="space-y-5 mt-12">
            {["Live classes from top educators", "JEE/NEET test series with rank", "AI doubt solver — available 24/7"].map((t) => (
              <div key={t} className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/20">
                  <Check className="h-4 w-4 text-secondary" />
                </div>
                <span className="text-sm font-medium text-white/80">{t}</span>
              </div>
            ))}
          </div>
          <p className="mt-12 text-sm text-white/60">Join 50,000+ students already learning</p>
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
                <input type="text" placeholder="Enter your name" className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Phone Number</label>
              <div className="mt-1 flex gap-2">
                <select className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium text-foreground">
                  <option>IN +91</option>
                  <option>AE +971</option>
                </select>
                <input type="tel" placeholder="Phone number" className="flex-1 rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="email" placeholder="you@example.com" className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative mt-1">
                <input type={showPassword ? "text" : "password"} placeholder="Min 8 characters" className="w-full rounded-lg border border-border bg-card py-2.5 px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Target Exam</label>
                <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground">
                  <option>IIT JEE</option>
                  <option>NEET</option>
                  <option>Boards</option>
                  <option>JEE + NEET</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Class</label>
                <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground">
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
                  <input type="text" placeholder="City" className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Country</label>
                <select className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground">
                  <option>India</option>
                  <option>UAE</option>
                </select>
              </div>
            </div>
            <button onClick={() => { toast.success("Account created! Please login."); navigate("/login"); }} className="w-full rounded-lg bg-gradient-to-r from-primary to-accent py-3 text-sm font-bold text-primary-foreground hover:opacity-90 transition-opacity">
              Create Account
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
