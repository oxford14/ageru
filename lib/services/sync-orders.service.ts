import { getPanel } from "@/lib/panel";
import { normalizeProviderStatus } from "@/lib/providers/normalize-status";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderRow, OrderStatus } from "@/lib/supabase/database.types";

export const ACTIVE_STATUSES: OrderStatus[] = ["pending", "processing", "in_progress"];

const BATCH_SIZE = 100;
const MIN_INTERVAL_MS = 15_000;
let lastRun = 0;

/**
 * Pulls the latest status for every active order from the panel.
 * Calls within 15s of each other are skipped unless `force` is set.
 */
export async function syncActiveOrders(opts: { userId?: string; force?: boolean } = {}) {
  if (!opts.force && Date.now() - lastRun < MIN_INTERVAL_MS) {
    return { checked: 0, changed: 0, skipped: true };
  }
  lastRun = Date.now();

  const supabase = createAdminClient();
  let query = supabase
    .from("orders")
    .select("*")
    .in("status", ACTIVE_STATUSES)
    .not("provider_order_id", "is", null)
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(500);
  if (opts.userId) query = query.eq("user_id", opts.userId);

  const { data: orders, error } = await query;
  if (error) throw error;
  if (!orders?.length) return { checked: 0, changed: 0, skipped: false };

  const panel = getPanel();
  let changed = 0;

  for (let i = 0; i < orders.length; i += BATCH_SIZE) {
    const chunk = orders.slice(i, i + BATCH_SIZE);
    const statuses = await panel.statuses(chunk.map((o) => o.provider_order_id!));
    const now = new Date().toISOString();

    for (const order of chunk) {
      const st = statuses[order.provider_order_id!];
      if (!st || st.error) continue;

      const status = normalizeProviderStatus(String(st.status ?? "processing"));
      const patch: Partial<OrderRow> = {
        status,
        provider_status: st.status ?? null,
        last_synced_at: now,
      };
      if (st.start_count != null && st.start_count !== "") patch.start_count = Number(st.start_count);
      if (st.remains != null && st.remains !== "") patch.remains = Math.max(0, Number(st.remains));
      if (st.charge != null && st.charge !== "") {
        patch.provider_cost = String(st.charge);
        patch.customer_charge = String(st.charge);
      }
      if (st.currency) patch.currency = st.currency;
      if (!ACTIVE_STATUSES.includes(status) && !order.completed_at) patch.completed_at = now;
      if (status !== order.status) {
        patch.updated_at = now;
        changed += 1;
      }

      await supabase.from("orders").update(patch).eq("id", order.id);
    }
  }

  return { checked: orders.length, changed, skipped: false };
}
