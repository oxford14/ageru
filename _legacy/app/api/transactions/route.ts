import { jsonOk, jsonError } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(20, Number(searchParams.get("limit") ?? 20)));

    const supabase = await createClient();
    const from = (page - 1) * limit;
    const { data, error, count } = await supabase
      .from("transactions")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (error) return jsonError(error.message, 500);
    return jsonOk({ items: data ?? [], page, limit, total: count ?? 0 });
  } catch {
    return jsonError("Unauthorized", 401);
  }
}
