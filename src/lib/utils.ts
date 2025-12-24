import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getScoreColor(score: number | null) {
  if (!score) return "text-muted-foreground";
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

export function getScoreBg(score: number | null) {
  if (!score) return "bg-muted";
  if (score >= 70) return "bg-green-100";
  if (score >= 40) return "bg-amber-100";
  return "bg-red-100";
}
