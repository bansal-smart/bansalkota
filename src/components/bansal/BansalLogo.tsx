import bansalLogo from "@/assets/bansal-logo.png";

type LogoProps = {
  className?: string;
  /** "full" = wordmark on white; "white" = inverted version on dark bg */
  variant?: "full" | "white";
};

const BansalLogo = ({ className = "h-10 w-auto", variant = "full" }: LogoProps) => {
  return (
    <img
      src={bansalLogo}
      alt="The Bansal Classes Private Limited — Ideal for Scholars"
      className={className}
      style={variant === "white" ? { filter: "brightness(0) invert(1)" } : undefined}
    />
  );
};

export default BansalLogo;
