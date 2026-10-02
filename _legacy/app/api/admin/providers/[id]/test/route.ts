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
    const balance = await provider.getBalance();
    return jsonOk({ ok: true, balance });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Test failed", 500);
  }
}
