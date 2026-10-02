import { jsonOk, jsonError } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*, services(name, description)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) return jsonError("Not found", 404);

    const { provider_cost, profit, ...customerSafe } = data;
    void provider_cost;
    void profit;

    return jsonOk(customerSafe);
  } catch {
    return jsonError("Unauthorized", 401);
  }
}
