import { ImageIcon } from "lucide-react";

interface Props {
  ratio: string;
  size?: string;
  note?: string;
  className?: string;
}

/**
 * Inline helper text shown next to image upload inputs across the admin/centre panels.
 * Surfaces the recommended aspect ratio so uploaded artwork matches what the public site renders.
 */
export default function AspectRatioHint({ ratio, size, note, className = "" }: Props) {
  return (
    <p
      className={`mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground ${className}`}
    >
      <ImageIcon className="h-3 w-3 shrink-0" />
      <span>
        Recommended aspect ratio: <strong className="font-semibold text-foreground">{ratio}</strong>
        {size && <> &middot; suggested {size}</>}
      </span>
      {note && <span className="opacity-80">— {note}</span>}
    </p>
  );
}
