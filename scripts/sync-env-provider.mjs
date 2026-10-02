import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createCipheriv, randomBytes, scryptSync } from "crypto";

config({ path: ".env.local" });

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw?.trim()) {
    console.error("ENCRYPTION_KEY is missing in .env.local");
    process.exit(1);
  }
  if (Buffer.from(raw, "base64").length === 32) {
    return Buffer.from(raw, "base64");
  }
  return scryptSync(raw, "socialboost-salt", 32);
}

function encryptSecret(plaintext) {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiUrl = process.env.PROVIDER_API_URL?.trim();
const apiKey = process.env.PROVIDER_API_KEY?.trim();

if (!url || !serviceKey || !apiUrl || !apiKey) {
  console.error("Missing Supabase or PROVIDER_* env vars");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);
const PROVIDER_ID = "00000000-0000-4000-8000-000000000002";

const row = {
  id: PROVIDER_ID,
  name: process.env.PROVIDER_NAME?.trim() || "SMM World",
  type: "smm_v2",
  api_url: apiUrl,
  encrypted_api_key: encryptSecret(apiKey),
  enabled: true,
  priority: 200,
  currency: process.env.PROVIDER_CURRENCY?.trim() || "USD",
  markup_percentage: process.env.PROVIDER_MARKUP_PERCENTAGE?.trim() || "50",
  health_status: "unknown",
};

const params = new URLSearchParams({ key: apiKey, action: "balance" });
const balanceRes = await fetch(apiUrl, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: params.toString(),
});
const balanceJson = await balanceRes.json().catch(() => ({}));

const { error } = await supabase.from("providers").upsert(row, { onConflict: "id" });
if (error) {
  console.error("Supabase upsert failed:", error.message);
  process.exit(1);
}

if (balanceJson.balance != null) {
  await supabase
    .from("providers")
    .update({
      last_balance: String(balanceJson.balance),
      last_sync_at: new Date().toISOString(),
      health_status: "healthy",
      currency: balanceJson.currency || row.currency,
    })
    .eq("id", PROVIDER_ID);
}

console.log("Provider synced:", row.name, "balance:", balanceJson);
