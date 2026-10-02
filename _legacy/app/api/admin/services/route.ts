import { jsonOk, jsonError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("services")
      .select("*, platforms(name), categories(name)")
      .order("name");
    if (error) return jsonError(error.message, 500);
    return jsonOk(data ?? []);
  } catch {
    return jsonError("Unauthorized", 401);
  }
}
