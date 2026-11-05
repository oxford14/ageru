import crypto from "crypto";

function flattenValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .filter((k) => obj[k] !== "" && obj[k] !== null && obj[k] !== undefined)
      .map((k) => `${k}=${flattenValue(obj[k])}`)
      .join("&");
  }
  return String(value);
}

export function starpagoSignPayload(
  payload: Record<string, unknown>,
  secretKey: string
): string {
  const entries = Object.entries(payload)
    .filter(([k, v]) => k !== "sign" && v !== "" && v !== null && v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${flattenValue(v)}`);

  const originStr = `${entries.join("&")}&key=${secretKey}`;
  return crypto.createHash("sha256").update(originStr, "utf8").digest("hex");
}

export function verifyStarpagoSign(
  payload: Record<string, unknown>,
  secretKey: string
): boolean {
  const sign = payload.sign;
  if (typeof sign !== "string" || !sign) return false;
  const expected = starpagoSignPayload(payload, secretKey);
  return expected.toLowerCase() === sign.toLowerCase();
}
