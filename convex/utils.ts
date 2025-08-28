export function inferNameFromEmail(email: string | undefined | null): string | null {
  if (!email) return null;
  try {
    const local = email.split("@")[0] ?? "";
    // Strip "+tag" parts, digits at the end, and non-letter separators
    const base = local.split("+")[0]!.replace(/[\d]+$/g, "");
    const parts = base
      .replace(/[._-]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return null;
    const pretty = parts
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(" ");
    return pretty || null;
  } catch {
    return null;
  }
}

