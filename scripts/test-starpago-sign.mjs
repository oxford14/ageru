import crypto from "crypto";

function flattenValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value)
      .sort()
      .filter((k) => value[k] !== "" && value[k] != null)
      .map((k) => `${k}=${flattenValue(value[k])}`)
      .join("&");
  }
  return String(value);
}

function starpagoSignPayload(payload, secretKey) {
  const entries = Object.entries(payload)
    .filter(([k, v]) => k !== "sign" && v !== "" && v != null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${flattenValue(v)}`);
  const originStr = `${entries.join("&")}&key=${secretKey}`;
  return crypto.createHash("sha256").update(originStr, "utf8").digest("hex");
}

const body = {
  appId: "appidxxx",
  amount: 100,
  currency: "PHP",
  merOrderNo: "orderxxx",
  notifyUrl: "http://example.com/notify",
};
const sign = starpagoSignPayload(body, "testkey");
if (typeof sign !== "string" || sign.length !== 64) {
  console.error("sign failed");
  process.exit(1);
}
console.log("starpago sign ok", sign.slice(0, 8) + "...");
