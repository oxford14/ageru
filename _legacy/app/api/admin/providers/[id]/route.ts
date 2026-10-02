import { z } from "zod";
import { jsonOk, jsonError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { encryptSecret } from "@/lib/crypto/secrets";
import { sanitizeProvider } from "@/lib/admin/provider-dto";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createAdminClient } from "@/lib/supabase/admin";

const patchSchema = z.object({
  name: z.string().optional(),
  api_url: z.string().url().optional().nullable(),
  api_key: z.string().optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
  markup_percentage: z.number().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = patchSchema.parse(await request.json());
    const supabase = createAdminClient();

    const patch: Partial<import("@/lib/supabase/database.types").ProviderRow> & {
      encrypted_api_key?: string;
    } = {
      updated_at: new Date().toISOString(),
    };
    if (body.name) patch.name = body.name;
    if (body.api_url !== undefined) patch.api_url = body.api_url;
    if (body.enabled !== undefined) patch.enabled = body.enabled;
    if (body.priority !== undefined) patch.priority = body.priority;
    if (body.markup_percentage !== undefined) {
      patch.markup_percentage = String(body.markup_percentage);
    }
    if (body.api_key) {
      patch.encrypted_api_key = encryptSecret(body.api_key);
    }

    const { data, error } = await supabase
      .from("providers")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return jsonError(error.message, 500);

    await writeAuditLog({
      adminId: admin.id,
      action: "provider.update",
      entityType: "provider",
      entityId: id,
    });

    return jsonOk(sanitizeProvider(data));
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed", 500);
  }
}
