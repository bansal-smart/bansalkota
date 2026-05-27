import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "orange" | "gray";

const map: Record<Tone, string> = {
  blue: "bg-bansal-blue-light text-bansal-blue",
  orange: "bg-bansal-orange-light text-bansal-orange-dark",
  gray: "bg-bansal-gray-light text-bansal-gray",
};

interface Props {
  tone?: Tone;
  /** Alias for `tone` to keep page code ergonomic. */
  variant?: Tone;
  className?: string;
  children: ReactNode;
}

const BansalBadge = ({ tone, variant, className, children }: Props) => {
  const finalTone: Tone = variant ?? tone ?? "blue";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        map[finalTone],
        className,
      )}
    >
      {children}
    </span>
  );
};

export default BansalBadge;
