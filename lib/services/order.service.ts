import { findService, getBalance, getPanel } from "@/lib/panel";
import {
  commentLines,
  estimateCost,
  fieldsForType,
  type PanelService,
} from "@/lib/panel/shared";
import { ProviderError, ProviderErrorCode } from "@/lib/providers/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidTargetUrl } from "@/lib/validators/url";
import type { OrderRow } from "@/lib/supabase/database.types";

export class OrderServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 400
  ) {
    super(message);
  }
}

export type PlaceOrderInput = {
  userId: string;
  customerId: string;
  serviceId: string;
  link: string;
  quantity?: number;
  comments?: string;
  username?: string;
  answerNumber?: string;
  idempotencyKey: string;
  comboGroupId?: string;
  comboPlanId?: string;
};

function resolveUnits(service: PanelService, input: PlaceOrderInput) {
  const fields = fieldsForType(service.type);
  if (!fields) {
    throw new OrderServiceError(
      `"${service.type}" services aren't supported here yet. Order this one directly on the panel.`,
      "UNSUPPORTED_TYPE"
    );
  }

  if (fields.comments) {
    const lines = commentLines(input.comments ?? "");
    if (lines.length < service.min || lines.length > service.max) {
      throw new OrderServiceError(
        `Enter between ${service.min} and ${service.max} comments, one per line.`,
        "INVALID_QUANTITY"
      );
    }
    return { fields, units: lines.length, comments: lines.join("\n") };
  }

  if (fields.quantity) {
    const q = input.quantity ?? 0;
    if (!Number.isInteger(q) || q < service.min || q > service.max) {
      throw new OrderServiceError(
        `Quantity must be between ${service.min.toLocaleString()} and ${service.max.toLocaleString()}.`,
        "INVALID_QUANTITY"
      );
    }
    return { fields, units: q };
  }

  return { fields, units: 1 };
}

export async function placeOrder(input: PlaceOrderInput): Promise<OrderRow> {
  const supabase = createAdminClient();
  const link = input.link.trim();

  if (!isValidTargetUrl(link)) {
    throw new OrderServiceError("Enter a full link (https://…) or a username.", "INVALID_TARGET");
  }

  const { data: existing } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", input.userId)
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (existing) return existing;

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("id", input.customerId)
    .maybeSingle();
  if (customerError) throw customerError;
  if (!customer) {
    throw new OrderServiceError("Pick a valid customer.", "INVALID_CUSTOMER", 400);
  }

  const service = await findService(input.serviceId);
  if (!service) {
    throw new OrderServiceError(
      "That service is no longer listed on the panel.",
      "INVALID_SERVICE",
      404
    );
  }

  const { fields, units, comments } = resolveUnits(service, input);
  if (fields.username && !input.username?.trim()) {
    throw new OrderServiceError("This service needs the comment author's username.", "INVALID_INPUT");
  }
  if (fields.answerNumber && !input.answerNumber?.trim()) {
    throw new OrderServiceError("Enter which poll answer to vote for.", "INVALID_INPUT");
  }

  const estimate = estimateCost(service, units).toFixed(6);
  const balance = await getBalance().catch(() => null);
  const currency = balance?.currency ?? "USD";

  const orderParams: Record<string, string | number> = {};
  if (comments) orderParams.comments = comments;
  if (fields.username && input.username) orderParams.username = input.username.trim();
  if (fields.answerNumber && input.answerNumber) orderParams.answer_number = input.answerNumber.trim();

  const { data: order, error: insertError } = await supabase
    .from("orders")
    .insert({
      user_id: input.userId,
      service_id: null,
      provider_service_id: service.id,
      service_name: service.name,
      service_type: service.type,
      service_category: service.category,
      rate: service.rate,
      currency,
      refill_supported: service.refill,
      cancel_supported: service.cancel,
      order_params: orderParams,
      target_url: link,
      quantity: units,
      remains: units,
      provider_cost: estimate,
      customer_charge: estimate,
      profit: "0",
      status: "pending",
      idempotency_key: input.idempotencyKey,
      combo_group_id: input.comboGroupId ?? null,
      combo_plan_id: input.comboPlanId ?? null,
      customer_id: input.customerId,
    })
    .select("*")
    .single();

  if (insertError || !order) {
    if (insertError?.code === "23505") {
      const { data: dup } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", input.userId)
        .eq("idempotency_key", input.idempotencyKey)
        .single();
      if (dup) return dup;
    }
    if (insertError?.code === "42703" || insertError?.code === "PGRST204") {
      throw new OrderServiceError(
        "The database is missing the new order columns. Run the latest Supabase migration.",
        "MIGRATION_REQUIRED",
        500
      );
    }
    throw new OrderServiceError("Couldn't save the order.", "ORDER_CREATE_FAILED", 500);
  }

  try {
    const panel = getPanel();
    const result = await panel.add({
      service: service.id,
      link,
      quantity: fields.quantity ? units : undefined,
      comments,
      username: orderParams.username as string | undefined,
      answer_number: orderParams.answer_number as string | undefined,
      idempotencyKey: input.idempotencyKey,
    });

    if (!result?.order) {
      throw new ProviderError(ProviderErrorCode.ORDER_REJECTED, "The panel didn't return an order id.");
    }

    getBalance.clear();
    const now = new Date().toISOString();
    const { data: updated } = await supabase
      .from("orders")
      .update({
        provider_order_id: String(result.order),
        status: "processing",
        updated_at: now,
      })
      .eq("id", order.id)
      .select("*")
      .single();
    return updated ?? order;
  } catch (e) {
    const timedOut = e instanceof ProviderError && e.code === ProviderErrorCode.PROVIDER_TIMEOUT;
    const message = timedOut
      ? "The panel didn't answer in time. Check your order history on the panel before trying again — it may have gone through."
      : e instanceof Error
        ? e.message
        : "The panel rejected the order.";

    await supabase
      .from("orders")
      .update({
        status: "provider_failed",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    const code =
      e instanceof ProviderError && e.code === ProviderErrorCode.INSUFFICIENT_PROVIDER_BALANCE
        ? "INSUFFICIENT_BALANCE"
        : "PROVIDER_FAILED";
    throw new OrderServiceError(message, code, 502);
  }
}

export async function requestRefill(userId: string, orderId: string) {
  const order = await getOwnOrder(userId, orderId);
  if (!order.provider_order_id) throw new OrderServiceError("This order never reached the panel.", "NO_PROVIDER_ORDER");
  if (!order.refill_supported) throw new OrderServiceError("This service doesn't offer refills.", "NOT_SUPPORTED");

  await getPanel().refill(order.provider_order_id);
  await createAdminClient()
    .from("orders")
    .update({ refill_requested_at: new Date().toISOString() })
    .eq("id", order.id);
}

export async function requestCancel(userId: string, orderId: string) {
  const order = await getOwnOrder(userId, orderId);
  if (!order.provider_order_id) throw new OrderServiceError("This order never reached the panel.", "NO_PROVIDER_ORDER");
  if (!order.cancel_supported) throw new OrderServiceError("This service can't be cancelled.", "NOT_SUPPORTED");

  const res = await getPanel().cancel(order.provider_order_id);
  const row = Array.isArray(res)
    ? res.find((r) => String(r.order) === order.provider_order_id)
    : undefined;
  if (row && typeof row.cancel === "object" && row.cancel?.error) {
    throw new OrderServiceError(row.cancel.error, "PROVIDER_FAILED", 502);
  }
  await createAdminClient()
    .from("orders")
    .update({ cancel_requested_at: new Date().toISOString() })
    .eq("id", order.id);
}

async function getOwnOrder(userId: string, orderId: string) {
  const { data } = await createAdminClient()
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new OrderServiceError("Order not found.", "NOT_FOUND", 404);
  return data;
}
