import { jsonOk, jsonError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getProviderInstance } from "@/lib/providers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const supabase = createAdminClient();
    const { data: row } = await supabase.from("providers").select("*").eq("id", id).single();
    if (!row) return jsonError("Not found", 404);

    const provider = getProviderInstance(row);
    const [balance, services] = await Promise.all([
      provider.getBalance(),
      provider.getServices(),
    ]);

    await supabase
      .from("providers")
      .update({
        last_balance: balance.balance,
        last_sync_at: new Date().toISOString(),
        health_status: "healthy",
      })
      .eq("id", id);

    return jsonOk({
      balance,
      serviceCount: services.length,
      preview: services.slice(0, 20),
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Sync failed", 500);
  }
}
