export function isValidTargetUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return /^@[\w.]+$/.test(value) || /^[\w.-]+$/.test(value);
  }
}
