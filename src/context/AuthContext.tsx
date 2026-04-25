import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/useAppStore";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isStaff: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const setStoreUser = useAppStore((s) => s.setUser);
  const setStoreGoal = useAppStore((s) => s.setCurrentGoal);

  const checkRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (data ?? []).map((r) => r.role);
    setIsStaff(roles.includes("staff") || roles.includes("admin"));
  };

  const loadProfile = async (authUser: User) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, target_exam, goal")
      .eq("user_id", authUser.id)
      .maybeSingle();

    const fallbackName =
      (authUser.user_metadata?.full_name as string | undefined) ||
      (authUser.user_metadata?.name as string | undefined) ||
      authUser.email?.split("@")[0] ||
      "Student";

    setStoreUser({
      id: authUser.id,
      full_name: profile?.full_name?.trim() || fallbackName,
      email: authUser.email || "",
      role: "student",
      target_exam: profile?.target_exam || "",
      avatar_url: profile?.avatar_url || (authUser.user_metadata?.avatar_url as string | undefined),
    });

    if (profile?.goal) setStoreGoal(profile.goal);
  };

  const refreshProfile = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) await loadProfile(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setTimeout(() => {
          checkRole(newSession.user.id);
          loadProfile(newSession.user);
        }, 0);
      } else {
        setIsStaff(false);
        setStoreUser(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      if (existing?.user) {
        Promise.all([checkRole(existing.user.id), loadProfile(existing.user)]).finally(() =>
          setLoading(false)
        );
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setStoreUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, isStaff, loading, signIn, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
