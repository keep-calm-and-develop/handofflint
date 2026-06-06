export function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Returns the URL when it is absolute http(s); otherwise null. */
export function resolveVisionImageUrl(value: string): string | null {
  const trimmed = value.trim();
  return isAbsoluteHttpUrl(trimmed) ? trimmed : null;
}
