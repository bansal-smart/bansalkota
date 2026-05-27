import { ButtonHTMLAttributes, forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "cta" | "outline" | "secondary" | "ghost-white";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const styles: Record<Variant, string> = {
  primary:
    "bg-bansal-blue text-white hover:bg-bansal-blue-dark shadow-blue",
  cta:
    "bg-bansal-orange text-white hover:bg-bansal-orange-dark font-semibold",
  outline:
    "border-2 border-bansal-blue text-bansal-blue bg-transparent hover:bg-bansal-blue hover:text-white",
  secondary:
    "bg-bansal-blue-light text-bansal-blue hover:bg-bansal-blue hover:text-white",
  "ghost-white":
    "border-2 border-white text-white bg-transparent hover:bg-white hover:text-bansal-blue",
};

const BansalButton = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-bansal-orange focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed",
        styles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);

BansalButton.displayName = "BansalButton";
export default BansalButton;
