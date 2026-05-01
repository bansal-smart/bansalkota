import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminUserRow = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  country: string | null;
  city: string | null;
  target_exam: string | null;
  plan: string;
  is_suspended: boolean;
  created_at: string;
  email: string | null;
  role: "student" | "teacher" | "mentor" | "admin" | "super_admin";
};

const PAGE_SIZE = 20;

export const useAdminUsers = (filter: string, search: string, page: number) => {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    // 1) Fetch profiles (paginated)
    let query = supabase
      .from("profiles")
      .select("user_id, full_name, phone, avatar_url, country, city, target_exam, plan, is_suspended, created_at", { count: "exact" })
      .order("created_at", { ascending: false });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data: profiles, count, error } = await query.range(from, to);

    if (error) {
      console.error(error);
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    const userIds = (profiles ?? []).map((p) => p.user_id);

    // 2) Fetch roles for these users
    const { data: roleRows } = userIds.length
      ? await supabase.from("user_roles").select("user_id, role").in("user_id", userIds)
      : { data: [] as { user_id: string; role: AdminUserRow["role"] }[] };

    const roleByUser = new Map<string, AdminUserRow["role"]>();
    (roleRows ?? []).forEach((r) => {
      // priority: admin > staff > teacher > student
      const priority: Record<string, number> = { admin: 4, staff: 3, teacher: 2, student: 1 };
      const cur = roleByUser.get(r.user_id);
      if (!cur || priority[r.role] > priority[cur]) roleByUser.set(r.user_id, r.role as AdminUserRow["role"]);
    });

    const merged: AdminUserRow[] = (profiles ?? []).map((p) => ({
      ...p,
      email: null,
      role: roleByUser.get(p.user_id) ?? "student",
    }));

    const filtered = filter === "all" ? merged : merged.filter((u) => u.role === filter);

    setRows(filtered);
    setTotal(count ?? 0);
    setLoading(false);
  }, [filter, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, total, loading, pageSize: PAGE_SIZE, reload: load };
};
