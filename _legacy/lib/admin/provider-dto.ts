import type { Tables } from "@/lib/supabase/database.types";
import { maskSecret } from "@/lib/crypto/secrets";

export function sanitizeProvider(row: Tables<"providers">) {
  const { encrypted_api_key, ...rest } = row;
  return {
    ...rest,
    api_key_masked: encrypted_api_key ? maskSecret() : null,
  };
}
