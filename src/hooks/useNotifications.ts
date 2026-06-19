import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAppStore, AppNotification } from "@/store/useAppStore";
import { useAuth } from "@/context/AuthContext";

export const useNotifications = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { setNotifications, addNotification } = useAppStore();
  const key = ["notifications", user?.id ?? null];

  const query = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, title, body, type, link, read_at, created_at, archived_at")
        .eq("user_id", user!.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    if (query.data) setNotifications(query.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, query.data]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          addNotification(payload.new as AppNotification);
          qc.invalidateQueries({ queryKey: key });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
};

export const markNotificationRead = async (id: string) => {
  const { markRead } = useAppStore.getState();
  markRead(id);
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
};

export const markAllNotificationsRead = async (userId: string) => {
  const { markAllRead } = useAppStore.getState();
  markAllRead();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
};

export const archiveNotification = async (id: string) => {
  const { archiveNotification } = useAppStore.getState();
  archiveNotification(id);
  await supabase
    .from("notifications")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
};
