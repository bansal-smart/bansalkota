import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "orange" | "gray";

const map: Record<Tone, string> = {
  blue: "bg-bansal-blue-light text-bansal-blue",
  orange: "bg-bansal-orange-light text-bansal-orange-dark",
  gray: "bg-bansal-gray-light text-bansal-gray",
};

const BansalBadge = ({ tone = "blue", children }: { tone?: Tone; children: ReactNode }) => (
  <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", map[tone])}>
    {children}
  </span>
);

export default BansalBadge;
