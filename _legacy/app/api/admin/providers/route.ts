import { z } from "zod";
import { jsonOk, jsonError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { encryptSecret } from "@/lib/crypto/secrets";
import { sanitizeProvider } from "@/lib/admin/provider-dto";
import { ensureEnvSmmProvider } from "@/lib/providers/ensure-env-provider";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createAdminClient } from "@/lib/supabase/admin";

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["manual", "smm_v2"]),
  api_url: z.string().url().optional().nullable(),
  api_key: z.string().optional(),
  currency: z.string().default("PHP"),
  enabled: z.boolean().default(false),
  priority: z.number().int().default(0),
  markup_percentage: z.number().default(50),
});

export async function GET() {
  try {
    await requireAdmin();
    await ensureEnvSmmProvider().catch(() => null);
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("providers").select("*").order("priority", { ascending: false });
    if (error) return jsonError(error.message, 500);
    return jsonOk((data ?? []).map(sanitizeProvider));
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = createSchema.parse(await request.json());
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("providers")
      .insert({
        name: body.name,
        type: body.type,
        api_url: body.api_url ?? null,
        encrypted_api_key: body.api_key ? encryptSecret(body.api_key) : null,
        currency: body.currency,
        enabled: body.enabled,
        priority: body.priority,
        markup_percentage: String(body.markup_percentage),
      })
      .select("*")
      .single();

    if (error) return jsonError(error.message, 500);

    await writeAuditLog({
      adminId: admin.id,
      action: "provider.create",
      entityType: "provider",
      entityId: data.id,
    });

    return jsonOk(sanitizeProvider(data), 201);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed", 500);
  }
}
