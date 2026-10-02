import { jsonOk, jsonError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ensureEnvSmmProvider } from "@/lib/providers/ensure-env-provider";

export async function POST() {
  try {
    await requireAdmin();
    const result = await ensureEnvSmmProvider();
    if (!result.synced) {
      if (result.reason === "missing_encryption_key") {
        return jsonError(
          "Set ENCRYPTION_KEY in .env.local (32-byte base64) to store provider credentials securely, then restart the dev server.",
          400
        );
      }
      return jsonError(
        "Set PROVIDER_API_URL and PROVIDER_API_KEY in .env.local",
        400
      );
    }
    return jsonOk(result);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Connect failed", 500);
  }
}
