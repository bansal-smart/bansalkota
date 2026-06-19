import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Enforces single-device login per user.
 *
 * Returns `{ kicked, deviceLabel }`. When `kicked` becomes true, the consumer
 * should present a blocking modal explaining that another device signed in.
 * The caller is responsible for signing the user out when they dismiss it.
 *
 * Pass `null` to disable enforcement (e.g. for admins/kiosks).
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
  const browser = /Edg/.test(ua)
    ? "Edge"
    : /Chrome/.test(ua)
    ? "Chrome"
    : /Safari/.test(ua)
    ? "Safari"
    : /Firefox/.test(ua)
    ? "Firefox"
    : "Browser";
  return `${platform} · ${browser}`;
};

export interface SingleDeviceState {
  kicked: boolean;
  newDeviceLabel: string | null;
  clear: () => void;
}

export function useSingleDeviceLogin(userId: string | null): SingleDeviceState {
  const lastSessionId = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [kicked, setKicked] = useState(false);
  const [newDeviceLabel, setNewDeviceLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      lastSessionId.current = null;
      setKicked(false);
      setNewDeviceLabel(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      let sessionId = localStorage.getItem(sessionKey(userId));
      if (!sessionId) {
        sessionId = (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`) as string;
        localStorage.setItem(sessionKey(userId), sessionId);
      }
      lastSessionId.current = sessionId;

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
        /* non-fatal */
      }

      if (cancelled) return;

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
            const next = (payload.new as { session_id?: string; device_label?: string })?.session_id;
            const label = (payload.new as { device_label?: string })?.device_label ?? null;
            if (next && next !== lastSessionId.current) {
              localStorage.removeItem(sessionKey(userId));
              setNewDeviceLabel(label);
              setKicked(true);
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

  return {
    kicked,
    newDeviceLabel,
    clear: () => {
      setKicked(false);
      setNewDeviceLabel(null);
    },
  };
}
