import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

export async function logAdminAction(input: {
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Json;
}) {
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    admin_id: input.adminId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
}
