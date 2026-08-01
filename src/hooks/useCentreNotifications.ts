import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export type CentreNotification = {
  id: string;
  title: string;
  body: string;
  priority: "normal" | "important" | "urgent";
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Empty array = broadcast to all centres. Non-empty = only these centres.
  target_centre_ids: string[];
};

export const CENTRE_NOTIFICATIONS_KEY = ["centre_notifications"] as const;

const fetchCentreNotifications = async () => {
  const { data, error } = await (supabase as any)
    .from("centre_notifications")
    .select(
      "id, title, body, priority, created_by, created_at, updated_at, centre_notification_targets(centre_id)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((n: any) => ({
    ...n,
    target_centre_ids: (n.centre_notification_targets ?? []).map((t: any) => t.centre_id),
  })) as CentreNotification[];
};

/**
 * Shared read hook for the one-way super-admin -> centre-admin broadcast
 * feed. Used by both the super admin "Centre Notifications" tab (to show
 * what's already been sent) and the centre admin "Notifications" tab (to
 * read what HQ sent). Writes (send/edit/delete) are super_admin-only and
 * live in AdminCentreNotificationsPage directly — RLS enforces this
 * server-side regardless.
 */
export const useCentreNotifications = () => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: CENTRE_NOTIFICATIONS_KEY,
    queryFn: fetchCentreNotifications,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    // Unique channel name per mount — this hook mounts concurrently in
    // multiple places (NotificationBell in the header + the page body on
    // /admin/centre-notifications), and Supabase JS errors/no-ops on a
    // second .subscribe() call reusing the same channel topic name.
    const channel = supabase
      .channel(`centre_notifications:all:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "centre_notifications" },
        () => qc.invalidateQueries({ queryKey: CENTRE_NOTIFICATIONS_KEY }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "centre_notification_targets" },
        () => qc.invalidateQueries({ queryKey: CENTRE_NOTIFICATIONS_KEY }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    notifications: query.data ?? [],
    loading: query.isPending,
    reload: () => qc.invalidateQueries({ queryKey: CENTRE_NOTIFICATIONS_KEY }),
  };
};

const LAST_SEEN_KEY_PREFIX = "bansal-centre-notifications-last-seen:";

/**
 * Unread state for a centre admin's copy of the bell icon. There is no
 * per-user recipient row for a broadcast (every centre_staff member reads
 * the same shared rows), so "read" is tracked client-side as a per-user
 * "last seen" timestamp in localStorage rather than a DB column.
 */
export const useCentreNotificationsUnread = () => {
  const { user, isCenterAdmin } = useAuth();
  const { notifications, loading } = useCentreNotifications();
  const storageKey = user ? `${LAST_SEEN_KEY_PREFIX}${user.id}` : null;
  const [lastSeen, setLastSeen] = useState<string | null>(() =>
    storageKey ? localStorage.getItem(storageKey) : null,
  );

  useEffect(() => {
    setLastSeen(storageKey ? localStorage.getItem(storageKey) : null);
  }, [storageKey]);

  const unread = isCenterAdmin
    ? notifications.filter((n) => !lastSeen || new Date(n.created_at) > new Date(lastSeen))
    : [];

  const markAllSeen = () => {
    if (!storageKey) return;
    const now = new Date().toISOString();
    localStorage.setItem(storageKey, now);
    setLastSeen(now);
  };

  return { notifications, unreadCount: unread.length, loading, markAllSeen };
};
