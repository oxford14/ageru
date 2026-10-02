import { jsonOk, jsonError } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { placeOrderSchema } from "@/lib/validators/orders";
import { OrderServiceError, placeOrder } from "@/lib/services/order.service";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(20, Number(searchParams.get("limit") ?? 20)));
    const search = searchParams.get("search");

    const supabase = await createClient();
    let query = supabase
      .from("orders")
      .select("*, services(name)", { count: "exact" })
      .eq("user_id", user.id);

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
  } catch {
    return jsonError("Unauthorized", 401);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`order:${user.id}`, 20, 60_000);
    if (!rl.ok) return jsonError("Too many requests", 429);

    const body = await request.json();
    const parsed = placeOrderSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const order = await placeOrder({
      userId: user.id,
      ...parsed.data,
    });

    return jsonOk(order, 201);
  } catch (e) {
    if (e instanceof OrderServiceError) {
      return jsonError(e.message, e.status, e.code);
    }
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return jsonError("Unauthorized", 401);
    }
    return jsonError("Failed to place order", 500);
  }
}
