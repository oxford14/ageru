import { fetchComboPlanById } from "@/lib/combo/plans";
import { OrderServiceError, placeOrder } from "@/lib/services/order.service";
import type { PlaceComboOrderPayload } from "@/lib/validators/combo-orders";
import type { OrderRow } from "@/lib/supabase/database.types";

export type ComboLineResult =
  | { slotId: string; ok: true; order: OrderRow }
  | { slotId: string; ok: false; error: string };

export type PlaceComboResult = {
  comboGroupId: string;
  results: ComboLineResult[];
  orders: OrderRow[];
  failures: ComboLineResult[];
};

export async function placeComboOrder(
  userId: string,
  payload: PlaceComboOrderPayload
): Promise<PlaceComboResult> {
  const plan = await fetchComboPlanById(payload.comboPlanId);
  if (!plan || !plan.active) {
    throw new OrderServiceError("That combo plan is not available.", "NOT_FOUND", 404);
  }

  const slotIds = new Set(plan.items.map((i) => i.id));
  for (const line of payload.lines) {
    if (!slotIds.has(line.slotId)) {
      throw new OrderServiceError("Combo line does not match this plan.", "INVALID_COMBO", 400);
    }
  }
  if (payload.lines.length !== plan.items.length) {
    throw new OrderServiceError(
      `This combo needs ${plan.items.length} lines.`,
      "INVALID_COMBO",
      400
    );
  }

  const results: ComboLineResult[] = [];
  const orders: OrderRow[] = [];

  for (const line of payload.lines) {
    try {
      const order = await placeOrder({
        userId,
        customerId: payload.customerId,
        serviceId: line.serviceId,
        link: line.link,
        quantity: line.quantity,
        comments: line.comments,
        username: line.username,
        answerNumber: line.answerNumber,
        idempotencyKey: line.idempotencyKey,
        comboGroupId: payload.comboGroupId,
        comboPlanId: payload.comboPlanId,
      });
      results.push({ slotId: line.slotId, ok: true, order });
      orders.push(order);
    } catch (e) {
      const message =
        e instanceof OrderServiceError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Order failed.";
      results.push({ slotId: line.slotId, ok: false, error: message });
    }
  }

  const failures = results.filter((r): r is Extract<ComboLineResult, { ok: false }> => !r.ok);
  return {
    comboGroupId: payload.comboGroupId,
    results,
    orders,
    failures,
  };
}
