import { jsonOk, jsonError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(20, Number(searchParams.get("limit") ?? 20)));
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const supabase = createAdminClient();
    let query = supabase
      .from("orders")
      .select("*, services(name), profiles(email, username)", { count: "exact" });

    if (status) query = query.eq("status", status as import("@/lib/supabase/database.types").OrderStatus);
    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,provider_order_id.ilike.%${search}%,target_url.ilike.%${search}%`
      );
    }

    const from = (page - 1) * limit;
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (error) return jsonError(error.message, 500);
    return jsonOk({ items: data ?? [], page, limit, total: count ?? 0 });
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return jsonError("Forbidden", 403);
    }
    return jsonError("Unauthorized", 401);
  }
}
