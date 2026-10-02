import { z } from "zod";
import { jsonOk, jsonError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getProviderInstance } from "@/lib/providers";
import { applyMarkup } from "@/lib/money";
import { writeAuditLog } from "@/lib/services/audit.service";
import { createAdminClient } from "@/lib/supabase/admin";

const importSchema = z.object({
  providerId: z.string().uuid(),
  platformId: z.string().uuid(),
  categoryId: z.string().uuid(),
  serviceIds: z.array(z.string()).min(1),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = importSchema.parse(await request.json());
    const supabase = createAdminClient();

    const { data: providerRow } = await supabase
      .from("providers")
      .select("*")
      .eq("id", body.providerId)
      .single();

    if (!providerRow) return jsonError("Provider not found", 404);

    const provider = getProviderInstance(providerRow);
    const remoteServices = await provider.getServices();
    const selected = remoteServices.filter((s) =>
      body.serviceIds.includes(s.providerServiceId)
    );

    const inserted = [];
    for (const s of selected) {
      const customerRate = applyMarkup(
        s.rate,
        String(providerRow.markup_percentage)
      );
      const slug = `import-${s.providerServiceId}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const { data } = await supabase
        .from("services")
        .upsert(
          {
            platform_id: body.platformId,
            category_id: body.categoryId,
            name: s.name,
            slug,
            description: s.description ?? null,
            provider_id: providerRow.id,
            provider_service_id: s.providerServiceId,
            provider_rate: s.rate,
            customer_rate: customerRate,
            min_quantity: s.min,
            max_quantity: s.max,
            refill_supported: s.refill,
            cancel_supported: s.cancel,
            active: true,
            is_demo: false,
          },
          { onConflict: "platform_id,slug" }
        )
        .select("*")
        .single();
      if (data) inserted.push(data);
    }

    await writeAuditLog({
      adminId: admin.id,
      action: "services.import",
      entityType: "provider",
      entityId: body.providerId,
      metadata: { count: inserted.length },
    });

    return jsonOk({ imported: inserted.length, items: inserted });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Import failed", 500);
  }
}
