import { jsonOk, jsonError } from "@/lib/api/response";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(20, Number(searchParams.get("limit") ?? 20)));
  const platform = searchParams.get("platform");
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const refill = searchParams.get("refill");
  const cancel = searchParams.get("cancel");

  const supabase = await createClient();
  let query = supabase
    .from("services")
    .select(
      "*, platforms(name, slug), categories(name, slug)",
      { count: "exact" }
    )
    .eq("active", true);

  if (platform) query = query.eq("platform_id", platform);
  if (category) query = query.eq("category_id", category);
  if (search) query = query.ilike("name", `%${search}%`);
  if (refill === "true") query = query.eq("refill_supported", true);
  if (cancel === "true") query = query.eq("cancel_supported", true);

  const from = (page - 1) * limit;
  const { data, error, count } = await query
    .order("name")
    .range(from, from + limit - 1);

  if (error) return jsonError(error.message, 500);
  return jsonOk({ items: data ?? [], page, limit, total: count ?? 0 });
}
