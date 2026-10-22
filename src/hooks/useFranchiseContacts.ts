import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FranchiseContact = {
  id: string;
  region: string;
  name: string;
  role: string;
  phone: string;
  display_order: number;
  is_active: boolean;
};

// Shown until the franchise_contacts table is available / if it is empty.
export const FRANCHISE_FALLBACK: FranchiseContact[] = [
  { id: "f1", region: "Kota H.O.", name: "Sparsh Dwivedi", role: "Head, New Ventures", phone: "9001822790", display_order: 0, is_active: true },
  { id: "f2", region: "Kota H.O.", name: "Senior Executive", role: "New Ventures", phone: "9119321345", display_order: 1, is_active: true },
  { id: "f3", region: "Karnataka Business Associate", name: "Anand Laxmikant Agroya", role: "Director", phone: "9028172611", display_order: 2, is_active: true },
  { id: "f4", region: "Karnataka Business Associate", name: "B.S. Krishna", role: "Operations Head", phone: "9028172613", display_order: 3, is_active: true },
];

/** Groups contacts by region, keeping first-seen region order. */
export function groupByRegion(list: FranchiseContact[]) {
  const map = new Map<string, FranchiseContact[]>();
  for (const c of list) map.set(c.region, [...(map.get(c.region) ?? []), c]);
  return Array.from(map, ([region, people]) => ({ region, people }));
}

export function useFranchiseContacts() {
  const [contacts, setContacts] = useState<FranchiseContact[]>(FRANCHISE_FALLBACK);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("franchise_contacts" as any)
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (cancelled || error || !data?.length) return;
      setContacts(data as unknown as FranchiseContact[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { contacts, sections: groupByRegion(contacts) };
}
