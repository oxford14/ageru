import { jsonOk, jsonError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = await request.json();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("services")
      .update(body)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return jsonError(error.message, 500);

    await writeAuditLog({
      adminId: admin.id,
      action: "service.update",
      entityType: "service",
      entityId: id,
      metadata: body,
    });

    return jsonOk(data);
  } catch {
    return jsonError("Unauthorized", 401);
  }
}
