import { useEffect, useState } from "react";

export default function CountdownTimer({ deadline }: { deadline: string }) {
  const target = new Date(deadline).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  const Cell = ({ v, label }: { v: number; label: string }) => (
    <div className="flex flex-col items-center rounded-md bg-foreground/5 px-3 py-1.5 min-w-[52px]">
      <span className="text-lg font-black tabular-nums">{String(v).padStart(2, "0")}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-2">
      <Cell v={d} label="Days" />
      <Cell v={h} label="Hrs" />
      <Cell v={m} label="Min" />
      <Cell v={s} label="Sec" />
    </div>
  );
}
