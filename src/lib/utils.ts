import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function inferNameFromEmailClient(email?: string | null): string | null {
  if (!email) return null;
  const local = email.split("@")[0] ?? "";
  const base = local.split("+")[0]!.replace(/[\d]+$/g, "");
  const parts = base.replace(/[._-]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
}
