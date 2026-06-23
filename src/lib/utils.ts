import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Format an ISO timestamp as DD/MM/YYYY (local time). Empty string for invalid input. */
export function formatTestDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Format an ISO timestamp as DD/MM/YYYY, HH:mm (24h local time). */
export function formatTestDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${formatTestDate(iso)}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

