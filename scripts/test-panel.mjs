import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const apiUrl = process.env.PROVIDER_API_URL?.trim();
const apiKey = process.env.PROVIDER_API_KEY?.trim();
if (!apiUrl || !apiKey) {
  console.error("Missing PROVIDER_API_URL or PROVIDER_API_KEY");
  process.exit(1);
}

const v3 =
  process.env.PROVIDER_API_VERSION === "v3" ||
  apiKey.startsWith("pf_live_") ||
  apiKey.startsWith("pf_test_") ||
  apiUrl.includes("/api/v3");

let res;
if (v3) {
  const base = apiUrl.includes("/api/v3")
    ? apiUrl.replace(/\/$/, "")
    : new URL(apiUrl).origin + "/api/v3";
  res = await fetch(`${base}/account`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
} else {
  const body = new URLSearchParams({ key: apiKey, action: "balance" });
  res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
}

const json = await res.json().catch(() => ({}));
console.log("Mode:", v3 ? "v3" : "v2");
console.log("HTTP:", res.status);
console.log("Response:", json);

if (!res.ok || json.error) process.exit(1);
