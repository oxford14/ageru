import { decryptSecret } from "@/lib/crypto/secrets";
import { ManualProvider } from "@/lib/providers/manual-provider";
import { SmmV2Provider } from "@/lib/providers/smm-v2-provider";
import type { ProviderRow, SocialServiceProvider } from "@/lib/providers/types";

export function getProviderInstance(row: ProviderRow): SocialServiceProvider {
  if (row.type === "manual") {
    return new ManualProvider(row.id, row.name, row.currency);
  }

  if (row.type === "smm_v2") {
    if (!row.api_url || !row.encrypted_api_key) {
      throw new Error("Provider is missing API configuration");
    }
    const apiKey = decryptSecret(row.encrypted_api_key);
    return new SmmV2Provider({
      id: row.id,
      name: row.name,
      apiUrl: row.api_url,
      apiKey,
      currency: row.currency,
    });
  }

  throw new Error(`Unsupported provider type: ${row.type}`);
}

export * from "./types";
export * from "./normalize-status";
export * from "./errors";
