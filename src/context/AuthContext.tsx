import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore } from "@/store/useAppStore";

export type UserRole = "student" | "teacher" | "staff" | "admin";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** True if the user has the 'staff' or 'admin' role. */
  isStaff: boolean;
  /** True if the user has the 'teacher' role (and is not staff/admin). */
  isTeacher: boolean;
  /** True if the user has no elevated role (default student). */
  isStudent: boolean;
  /** The resolved primary role of the current user, or null when signed out. */
  role: UserRole | null;
  /**
   * True once we've finished resolving the user's role from the server for the
   * current session. Use this in route guards to avoid flickering or wrong
   * redirects while role data is still loading.
   */
  roleReady: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /**
   * Re-checks the user's role against the server (user_roles table via has_role
   * RPCs). Returns true if the current user has staff or admin privileges.
   * Resolves to false if there is no active session.
   */
  refreshRole: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [roleReady, setRoleReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const setStoreUser = useAppStore((s) => s.setUser);
  const setStoreGoal = useAppStore((s) => s.setCurrentGoal);
  // Track which user we last resolved a role for to avoid stale writes when
  // multiple sign-in events fire in quick succession.
  const lastRoleUserId = useRef<string | null>(null);

  const isStaff = role === "staff" || role === "admin";
  const isTeacher = role === "teacher";
  const isStudent = role === "student";

  /**
   * Server-verified role check. Calls the `has_role` security-definer RPC for
   * 'admin', 'staff', and 'teacher' so the answer comes from the database (not
   * from a client-side query that could be tampered with). Defaults to
   * 'student' when none of the elevated roles match.
   */
  const resolveRoleFromServer = useCallback(async (userId: string): Promise<UserRole> => {
    try {
      const [adminRes, staffRes, teacherRes] = await Promise.all([
        supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "staff" }),
        supabase.rpc("has_role", { _user_id: userId, _role: "teacher" }),
      ]);
      if (adminRes.data) return "admin";
      if (staffRes.data) return "staff";
      if (teacherRes.data) return "teacher";
      return "student";
    } catch (err) {
      console.error("Failed to resolve role:", err);
      // Fall back to direct table read (RLS still applies — users can only
      // read their own roles), so we degrade safely instead of hard-failing.
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const roles = (data ?? []).map((r) => r.role as UserRole);
      if (roles.includes("admin")) return "admin";
      if (roles.includes("staff")) return "staff";
      if (roles.includes("teacher")) return "teacher";
      return "student";
    }
  }, []);

  const checkRole = useCallback(
    async (userId: string): Promise<boolean> => {
      lastRoleUserId.current = userId;
      const resolved = await resolveRoleFromServer(userId);
      // Guard against a race where another sign-in/out happened while we were awaiting
      if (lastRoleUserId.current !== userId) {
        return resolved === "staff" || resolved === "admin";
      }
      setRole(resolved);
      setRoleReady(true);
      return resolved === "staff" || resolved === "admin";
    },
    [resolveRoleFromServer],
  );

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

  const refreshRole = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) {
      lastRoleUserId.current = null;
      setRole(null);
      setRoleReady(true);
      return false;
    }
    return checkRole(u.id);
  }, [checkRole]);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        // Reset roleReady so consumers know the next role check is in flight.
        setRoleReady(false);
        // Defer the async work so we don't block the auth listener callback.
        setTimeout(() => {
          checkRole(newSession.user.id);
          loadProfile(newSession.user);
        }, 0);
      } else {
        lastRoleUserId.current = null;
        setRole(null);
        setRoleReady(true); // No user = role question is "resolved"
        setStoreUser(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      if (existing?.user) {
        Promise.all([checkRole(existing.user.id), loadProfile(existing.user)]).finally(() =>
          setLoading(false),
        );
      } else {
        setRoleReady(true);
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    // Resolve the role synchronously here so callers can rely on isStaff being
    // correct as soon as signIn() resolves.
    if (data.user) {
      await checkRole(data.user.id);
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setStoreUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isStaff,
        isTeacher,
        isStudent,
        role,
        roleReady,
        loading,
        signIn,
        signOut,
        refreshProfile,
        refreshRole,
      }}
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
