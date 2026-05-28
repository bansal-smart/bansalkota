import { cn } from "@/lib/utils";
import {
  Atom, BookOpen, Calculator, FlaskConical, Trophy, Sparkles, Star,
  GraduationCap, Lightbulb, Target, Award, Microscope, PenTool, Brain,
  type LucideIcon,
} from "lucide-react";

/* ---------------- Soft glow blobs ---------------- */
interface GlowBlobProps {
  color?: "orange" | "blue" | "white";
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}
const sizeMap = {
  sm: "h-40 w-40",
  md: "h-64 w-64",
  lg: "h-96 w-96",
  xl: "h-[32rem] w-[32rem]",
};
const colorMap = {
  orange: "bg-bansal-orange/20",
  blue: "bg-bansal-blue/20",
  white: "bg-white/10",
};
export const GlowBlob = ({ color = "orange", size = "lg", className }: GlowBlobProps) => (
  <div
    aria-hidden
    className={cn(
      "pointer-events-none absolute rounded-full blur-3xl",
      sizeMap[size],
      colorMap[color],
      className,
    )}
  />
);

/* ---------------- Grid / Dot textures ---------------- */
export const GridTexture = ({
  className,
  tone = "blue",
}: {
  className?: string;
  tone?: "blue" | "orange" | "white";
}) => {
  const stroke =
    tone === "orange" ? "hsl(25 100% 50% / 0.18)" :
    tone === "white" ? "hsl(0 0% 100% / 0.18)" :
    "hsl(221 70% 33% / 0.12)";
  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={`grid-${tone}`} width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke={stroke} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#grid-${tone})`} />
    </svg>
  );
};

export const DotTexture = ({
  className,
  tone = "blue",
}: {
  className?: string;
  tone?: "blue" | "orange" | "white";
}) => {
  const fill =
    tone === "orange" ? "hsl(25 100% 50% / 0.25)" :
    tone === "white" ? "hsl(0 0% 100% / 0.25)" :
    "hsl(221 70% 33% / 0.18)";
  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={`dots-${tone}`} width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill={fill} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#dots-${tone})`} />
    </svg>
  );
};

/* ---------------- Corner sparkle cluster ---------------- */
export const CornerSparkles = ({
  className,
  tone = "orange",
  position = "tr",
}: {
  className?: string;
  tone?: "orange" | "blue";
  position?: "tr" | "tl" | "br" | "bl";
}) => {
  const pos =
    position === "tr" ? "top-2 right-2" :
    position === "tl" ? "top-2 left-2" :
    position === "br" ? "bottom-2 right-2" :
    "bottom-2 left-2";
  const color = tone === "blue" ? "text-bansal-blue/30" : "text-bansal-orange/40";
  return (
    <div aria-hidden className={cn("pointer-events-none absolute flex items-center gap-0.5", pos, className)}>
      <Sparkles className={cn("h-3 w-3", color)} />
      <Star className={cn("h-2 w-2", color)} />
    </div>
  );
};

/* ---------------- Floating brand icons ---------------- */
type FloatingIcon = {
  Icon: LucideIcon;
  top: string;
  left?: string;
  right?: string;
  size?: number;
  delay?: number;
  tone?: "orange" | "blue" | "white";
};

const toneClass = {
  orange: "text-bansal-orange/15",
  blue: "text-bansal-blue/15",
  white: "text-white/15",
};

const DEFAULT_ICONS: FloatingIcon[] = [
  { Icon: Atom, top: "8%", left: "4%", size: 56, delay: 0, tone: "orange" },
  { Icon: BookOpen, top: "70%", left: "6%", size: 44, delay: 1.5, tone: "blue" },
  { Icon: Calculator, top: "20%", right: "8%", size: 40, delay: 0.8, tone: "orange" },
  { Icon: FlaskConical, top: "60%", right: "5%", size: 52, delay: 2.2, tone: "blue" },
  { Icon: Trophy, top: "40%", left: "48%", size: 36, delay: 1.2, tone: "orange" },
  { Icon: GraduationCap, top: "85%", right: "30%", size: 44, delay: 0.4, tone: "blue" },
  { Icon: Lightbulb, top: "12%", left: "55%", size: 32, delay: 1.8, tone: "orange" },
];

export const FloatingIcons = ({
  className,
  icons = DEFAULT_ICONS,
  defaultTone = "blue",
}: {
  className?: string;
  icons?: FloatingIcon[];
  defaultTone?: "orange" | "blue" | "white";
}) => (
  <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
    {icons.map(({ Icon, top, left, right, size = 40, delay = 0, tone }, i) => (
      <Icon
        key={i}
        className={cn("absolute animate-float-slow", toneClass[tone ?? defaultTone])}
        style={{
          top,
          left,
          right,
          width: size,
          height: size,
          animationDelay: `${delay}s`,
        }}
      />
    ))}
  </div>
);

/* ---------------- Diagonal accent stripes ---------------- */
export const DiagonalAccent = ({ className }: { className?: string }) => (
  <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
    <div className="absolute -top-10 -right-10 h-40 w-[140%] rotate-[-3deg] bg-gradient-to-r from-transparent via-bansal-orange/10 to-transparent" />
    <div className="absolute bottom-0 -left-10 h-32 w-[140%] rotate-[2deg] bg-gradient-to-r from-transparent via-bansal-blue/10 to-transparent" />
  </div>
);

/* ---------------- Re-exported icon set for marketing usage ---------------- */
export const BRAND_ICONS = {
  Atom, BookOpen, Calculator, FlaskConical, Trophy, GraduationCap,
  Lightbulb, Target, Award, Microscope, PenTool, Brain, Sparkles, Star,
};
