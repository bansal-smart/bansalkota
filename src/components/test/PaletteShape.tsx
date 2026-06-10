import { ReactNode } from "react";

export type PaletteStatus =
  | "not-visited"
  | "answered"
  | "not-answered"
  | "marked"
  | "answered-marked";

type Props = {
  status: PaletteStatus;
  children?: ReactNode;
  active?: boolean;
  size?: number;
  onClick?: () => void;
  asButton?: boolean;
  title?: string;
};

/**
 * NTA/JEE CBT shapes:
 *  - answered           = green pentagon (point down)
 *  - not-answered       = red inverted pentagon (point up)
 *  - marked             = violet circle
 *  - answered-marked    = violet circle + green check
 *  - not-visited        = white square w/ grey border
 */
const PaletteShape = ({
  status,
  children,
  active,
  size = 40,
  onClick,
  asButton = true,
  title,
}: Props) => {
  const s = size;
  const fontSize = Math.max(10, Math.floor(s * 0.38));

  const ring = active
    ? "outline outline-2 outline-offset-2 outline-primary"
    : "";

  const wrapperCls = `relative inline-flex items-center justify-center font-bold tabular-nums text-white shrink-0 ${ring}`;
  const styleBase: React.CSSProperties = {
    width: s,
    height: s,
    fontSize,
    lineHeight: 1,
  };

  // SVG path for pentagon shapes — drawn inside an absolute layer so the
  // numeral can sit centered on top using flexbox.
  const pentagonDown = (fill: string) => (
    <svg
      viewBox="0 0 40 40"
      className="absolute inset-0 h-full w-full drop-shadow-sm"
      preserveAspectRatio="none"
    >
      <polygon points="2,2 38,2 38,24 20,38 2,24" fill={fill} />
    </svg>
  );
  const pentagonUp = (fill: string) => (
    <svg
      viewBox="0 0 40 40"
      className="absolute inset-0 h-full w-full drop-shadow-sm"
      preserveAspectRatio="none"
    >
      <polygon points="20,2 38,16 38,38 2,38 2,16" fill={fill} />
    </svg>
  );

  let shape: ReactNode = null;
  let textCls = "text-white";

  switch (status) {
    case "answered":
      shape = pentagonDown("#16a34a");
      break;
    case "not-answered":
      shape = pentagonUp("#dc2626");
      break;
    case "marked":
      shape = (
        <span
          className="absolute inset-0 rounded-full shadow-sm"
          style={{ background: "#7c3aed" }}
        />
      );
      break;
    case "answered-marked":
      shape = (
        <>
          <span
            className="absolute inset-0 rounded-full shadow-sm"
            style={{ background: "#7c3aed" }}
          />
          <svg
            viewBox="0 0 24 24"
            className="absolute -bottom-1 -right-1 h-3.5 w-3.5"
          >
            <circle cx="12" cy="12" r="11" fill="#16a34a" />
            <path
              d="M7 12.5l3 3 7-7"
              stroke="white"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </>
      );
      break;
    case "not-visited":
    default:
      shape = (
        <span
          className="absolute inset-0 rounded-sm border border-neutral-400 bg-white shadow-sm"
        />
      );
      textCls = "text-neutral-700";
      break;
  }

  const inner = (
    <>
      {shape}
      <span className={`relative z-10 ${textCls}`} style={{ fontSize }}>
        {children}
      </span>
    </>
  );

  if (!asButton) {
    return (
      <span className={wrapperCls} style={styleBase} title={title}>
        {inner}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`${wrapperCls} transition-transform hover:scale-105`}
      style={styleBase}
    >
      {inner}
    </button>
  );
};

export default PaletteShape;
