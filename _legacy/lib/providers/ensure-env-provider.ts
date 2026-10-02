import { encryptSecret } from "@/lib/crypto/secrets";
import { getProviderInstance } from "@/lib/providers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProviderHealth } from "@/lib/supabase/database.types";

const DEFAULT_SMM_PROVIDER_ID = "00000000-0000-4000-8000-000000000002";

export function getEnvProviderConfig() {
  const apiUrl = process.env.PROVIDER_API_URL?.trim();
  const apiKey = process.env.PROVIDER_API_KEY?.trim();
  if (!apiUrl || !apiKey) return null;

  return {
    apiUrl,
    apiKey,
    name: process.env.PROVIDER_NAME?.trim() || "SMM World",
    currency: process.env.PROVIDER_CURRENCY?.trim() || "USD",
    markupPercentage:
      process.env.PROVIDER_MARKUP_PERCENTAGE?.trim() || "50",
  };
}

export type EnsureEnvProviderResult =
  | { synced: false; reason: "missing_env" | "missing_encryption_key" }
  | {
      synced: true;
      providerId: string;
      balance?: { balance: string; currency: string };
      healthWarning?: string;
    };

export async function ensureEnvSmmProvider(): Promise<EnsureEnvProviderResult> {
  const cfg = getEnvProviderConfig();
  if (!cfg) return { synced: false, reason: "missing_env" };

  if (!process.env.ENCRYPTION_KEY?.trim()) {
    return { synced: false, reason: "missing_encryption_key" };
  }

  const supabase = createAdminClient();
  const encrypted = encryptSecret(cfg.apiKey);

  const rowPayload = {
    name: cfg.name,
    type: "smm_v2",
    api_url: cfg.apiUrl,
    encrypted_api_key: encrypted,
    enabled: true,
    priority: 200,
    currency: cfg.currency,
    markup_percentage: cfg.markupPercentage,
    health_status: "unknown" as ProviderHealth,
  };

  const { data: byUrl } = await supabase
    .from("providers")
    .select("id")
    .eq("api_url", cfg.apiUrl)
    .maybeSingle();

  let providerId = byUrl?.id;

  if (providerId) {
    const { error } = await supabase
      .from("providers")
      .update(rowPayload)
      .eq("id", providerId);
    if (error) throw new Error(error.message);
  } else {
    const { data: inserted, error } = await supabase
      .from("providers")
      .insert({ ...rowPayload, id: DEFAULT_SMM_PROVIDER_ID })
      .select("id")
      .single();

    if (error?.code === "23505") {
      const { data: updated, error: updateErr } = await supabase
        .from("providers")
        .update(rowPayload)
        .eq("id", DEFAULT_SMM_PROVIDER_ID)
        .select("id")
        .single();
      if (updateErr) throw new Error(updateErr.message);
      providerId = updated.id;
    } else if (error) {
      const { data: fallback, error: insertErr } = await supabase
        .from("providers")
        .insert(rowPayload)
        .select("id")
        .single();
      if (insertErr) throw new Error(insertErr.message);
      providerId = fallback.id;
    } else {
      providerId = inserted.id;
    }
  }

  if (!providerId) {
    throw new Error("Failed to resolve provider id after sync");
  }

  const { data: row } = await supabase
    .from("providers")
    .select("*")
    .eq("id", providerId)
    .single();

  if (!row) {
    throw new Error("Provider row missing after sync");
  }

  try {
    const provider = getProviderInstance(row);
    const balance = await provider.getBalance();
    await supabase
      .from("providers")
      .update({
        last_balance: balance.balance,
        last_sync_at: new Date().toISOString(),
        health_status: "healthy",
        currency: balance.currency || cfg.currency,
      })
      .eq("id", providerId);

    return { synced: true, providerId, balance };
  } catch (e) {
    return {
      synced: true,
      providerId,
      healthWarning: e instanceof Error ? e.message : "Connection test failed",
    };
  }
}
