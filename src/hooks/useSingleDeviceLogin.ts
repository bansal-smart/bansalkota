import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Enforces single-device login per user.
 *
 * On mount (whenever a `userId` is present), this hook:
 *  1. Generates a unique session_id for this browser (stored in localStorage).
 *  2. UPSERTs `active_sessions` row { user_id, session_id, device_label }
 *     — this *kicks* any other device because the row's session_id no longer
 *     matches theirs.
 *  3. Subscribes to realtime UPDATEs on this user's row. If another device
 *     takes over (session_id changes), this device is signed out immediately.
 *
 * Pass `null` (no user) to tear everything down.
 */
const sessionKey = (uid: string) => `bansal_device_session:${uid}`;

const detectDevice = () => {
  if (typeof navigator === "undefined") return "Unknown device";
  const ua = navigator.userAgent;
  const platform = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
    ? "Android"
    : /Mac/.test(ua)
    ? "Mac"
    : /Windows/.test(ua)
    ? "Windows"
    : /Linux/.test(ua)
    ? "Linux"
    : "Web";
  const browser = /Chrome/.test(ua)
    ? "Chrome"
    : /Safari/.test(ua)
    ? "Safari"
    : /Firefox/.test(ua)
    ? "Firefox"
    : /Edge/.test(ua)
    ? "Edge"
    : "Browser";
  return `${platform} · ${browser}`;
};

export function useSingleDeviceLogin(userId: string | null) {
  const lastSessionId = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      lastSessionId.current = null;
      return;
    }

    let cancelled = false;

    const run = async () => {
      // 1. Generate (or reuse) a per-user session token for this device
      let sessionId = localStorage.getItem(sessionKey(userId));
      if (!sessionId) {
        sessionId = (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`) as string;
        localStorage.setItem(sessionKey(userId), sessionId);
      }
      lastSessionId.current = sessionId;

      // 2. Claim the slot for this user (kicks any other device).
      try {
        await supabase
          .from("active_sessions")
          .upsert(
            {
              user_id: userId,
              session_id: sessionId,
              device_label: detectDevice(),
              last_seen: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
      } catch {
        /* network errors — non-fatal */
      }

      if (cancelled) return;

      // 3. Watch for any later UPDATE that swaps the session_id (= a newer login).
      const ch = supabase
        .channel(`single-device:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "active_sessions",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const next = (payload.new as { session_id?: string })?.session_id;
            if (next && next !== lastSessionId.current) {
              toast.error("Signed in on another device. You've been logged out here.", {
                duration: 7000,
              });
              // Local cleanup + force sign out
              localStorage.removeItem(sessionKey(userId));
              supabase.auth.signOut().finally(() => {
                // Soft redirect after a moment so the toast is visible
                setTimeout(() => {
                  window.location.href = "/login";
                }, 1200);
              });
            }
          },
        )
        .subscribe();

      channelRef.current = ch;
    };

    run();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId]);
}
