"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/owner";
import {
  OrderServiceError,
  placeOrder,
  requestCancel,
  requestRefill,
} from "@/lib/services/order.service";
import { syncActiveOrders } from "@/lib/services/sync-orders.service";
import { placeComboOrder } from "@/lib/services/combo-order.service";
import { placeOrderSchema, type PlaceOrderPayload } from "@/lib/validators/orders";
import {
  placeComboOrderSchema,
  type PlaceComboOrderPayload,
} from "@/lib/validators/combo-orders";
import { rateLimit } from "@/lib/rate-limit";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function failure(e: unknown): { ok: false; error: string } {
  if (e instanceof OrderServiceError) return { ok: false, error: e.message };
  if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
    return { ok: false, error: "You're not allowed to do that. Sign in again." };
  }
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
}

export async function placeOrderAction(
  payload: PlaceOrderPayload
): Promise<Result<{ id: string; orderNumber: string; providerOrderId: string | null }>> {
  try {
    const user = await requireOwner();
    if (!rateLimit(`order:${user.id}`, 20, 60_000).ok) {
      return { ok: false, error: "Too many orders in a minute. Wait a moment." };
    }
    const parsed = placeOrderSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    }
    const order = await placeOrder({ userId: user.id, ...parsed.data });
    revalidatePath("/dashboard");
    revalidatePath("/orders");
    revalidatePath("/customers");
    if (parsed.data.customerId) revalidatePath(`/customers/${parsed.data.customerId}`);
    return {
      ok: true,
      data: { id: order.id, orderNumber: order.order_number, providerOrderId: order.provider_order_id },
    };
  } catch (e) {
    revalidatePath("/orders");
    return failure(e);
  }
}

export async function placeComboOrderAction(
  payload: PlaceComboOrderPayload
): Promise<
  Result<{
    comboGroupId: string;
    orders: { id: string; orderNumber: string; providerOrderId: string | null }[];
    failures: { slotId: string; error: string }[];
    partial: boolean;
  }>
> {
  try {
    const user = await requireOwner();
    if (!rateLimit(`order:${user.id}`, 20, 60_000).ok) {
      return { ok: false, error: "Too many orders in a minute. Wait a moment." };
    }
    const parsed = placeComboOrderSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
    }
    const result = await placeComboOrder(user.id, parsed.data);
    revalidatePath("/dashboard");
    revalidatePath("/orders");
    revalidatePath("/combos");
    revalidatePath("/customers");
    if (parsed.data.customerId) revalidatePath(`/customers/${parsed.data.customerId}`);
    const failures = result.results
      .filter((r): r is { slotId: string; ok: false; error: string } => !r.ok)
      .map((f) => ({ slotId: f.slotId, error: f.error }));
    if (failures.length === result.results.length) {
      return {
        ok: false,
        error: failures.map((f) => f.error).join(" · ") || "All combo lines failed.",
      };
    }
    return {
      ok: true,
      data: {
        comboGroupId: result.comboGroupId,
        partial: failures.length > 0,
        failures,
        orders: result.orders.map((o) => ({
          id: o.id,
          orderNumber: o.order_number,
          providerOrderId: o.provider_order_id,
        })),
      },
    };
  } catch (e) {
    return failure(e);
  }
}

export async function refreshOrdersAction(force = false): Promise<Result<{ changed: number }>> {
  try {
    const user = await requireOwner();
    const res = await syncActiveOrders({ userId: user.id, force });
    return { ok: true, data: { changed: res.changed } };
  } catch (e) {
    return failure(e);
  }
}

export async function refillOrderAction(orderId: string): Promise<Result> {
  try {
    const user = await requireOwner();
    await requestRefill(user.id, orderId);
    revalidatePath(`/orders/${orderId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return failure(e);
  }
}

export async function cancelOrderAction(orderId: string): Promise<Result> {
  try {
    const user = await requireOwner();
    await requestCancel(user.id, orderId);
    await syncActiveOrders({ userId: user.id, force: true }).catch(() => null);
    revalidatePath(`/orders/${orderId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return failure(e);
  }
}
