import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format seconds as m:ss */
export function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Format seconds as m:ss.s (with tenths) */
export function formatTimePrecise(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00.0';
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(1);
  return `${m}:${sec.padStart(4, '0')}`;
}
