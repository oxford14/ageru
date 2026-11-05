"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";
import { requireReseller } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateCharge, money } from "@/lib/money";

const createSchema = z.object({
  serviceId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  targetUrl: z.string().trim().min(3).max(2000),
  idempotencyKey: z.string().uuid().optional(),
});

export type ResellerServiceDto = {
  id: string;
  name: string;
  description: string | null;
  unitLabel: string;
  minQuantity: number;
  maxQuantity: number;
  pricePerThousand: string;
};

export async function listResellerServicesAction(): Promise<ResellerServiceDto[]> {
  await requireReseller();
  const admin = createAdminClient();
  const { data: services } = await admin
    .from("reseller_services")
    .select("id, name, description, unit_label, min_quantity, max_quantity, active")
    .eq("active", true)
    .order("sort_order");

  const ids = (services ?? []).map((s) => s.id);
  if (!ids.length) return [];

  const { data: prices } = await admin
    .from("reseller_service_prices")
    .select("service_id, price_per_unit")
    .in("service_id", ids)
    .eq("active", true);

  const priceByService = new Map((prices ?? []).map((p) => [p.service_id, p.price_per_unit]));

  return (services ?? [])
    .map((s) => {
      const price = priceByService.get(s.id);
      if (!price) return null;
      return {
        id: s.id,
        name: s.name,
        description: s.description,
        unitLabel: s.unit_label,
        minQuantity: s.min_quantity,
        maxQuantity: s.max_quantity,
        pricePerThousand: price,
      };
    })
    .filter(Boolean) as ResellerServiceDto[];
}

export async function createResellerRequestAction(input: z.input<typeof createSchema>) {
  const user = await requireReseller();
  const data = createSchema.parse(input);
  const admin = createAdminClient();

  const { data: service } = await admin
    .from("reseller_services")
    .select("*")
    .eq("id", data.serviceId)
    .eq("active", true)
    .maybeSingle();
  if (!service) throw new Error("Service not available");

  if (data.quantity < service.min_quantity || data.quantity > service.max_quantity) {
    throw new Error(`Quantity must be between ${service.min_quantity} and ${service.max_quantity}.`);
  }

  const { data: priceRow } = await admin
    .from("reseller_service_prices")
    .select("price_per_unit")
    .eq("service_id", data.serviceId)
    .eq("active", true)
    .maybeSingle();
  if (!priceRow) throw new Error("Pricing not configured");

  const amountPhp = calculateCharge(priceRow.price_per_unit, data.quantity);
  const amountNum = money(amountPhp).toNumber();

  const { data: wallet } = await admin
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!wallet || money(wallet.balance).lt(amountPhp)) {
    throw new Error("Insufficient wallet balance. Fund your account first.");
  }

  const requestId = randomUUID();
  const idempotencyKey = data.idempotencyKey ?? randomUUID();

  const { data: reserveRows, error: rpcError } = await admin.rpc(
    "wallet_reserve_for_reseller_request",
    {
      p_user_id: user.id,
      p_amount: amountNum,
      p_request_id: requestId,
      p_idempotency_key: `reseller-request-${idempotencyKey}`,
    }
  );

  if (rpcError) {
    if (rpcError.message.includes("insufficient_balance")) {
      throw new Error("Insufficient wallet balance. Fund your account first.");
    }
    throw new Error(rpcError.message);
  }

  const reserve = (
    Array.isArray(reserveRows) ? reserveRows[0] : reserveRows
  ) as { transaction_id: string } | undefined;

  const { error: insertError } = await admin.from("reseller_requests").insert({
    id: requestId,
    reseller_id: user.id,
    service_id: data.serviceId,
    quantity: data.quantity,
    target_url: data.targetUrl,
    amount_php: amountPhp,
    status: "pending",
    idempotency_key: idempotencyKey,
    transaction_id: reserve?.transaction_id ?? null,
  });

  if (insertError) {
    await admin.rpc("wallet_refund_reseller_request", {
      p_user_id: user.id,
      p_amount: amountNum,
      p_request_id: requestId,
      p_idempotency_key: `reseller-request-refund-${idempotencyKey}`,
    });
    throw new Error(insertError.message);
  }

  revalidatePath("/reseller/requests");
  revalidatePath("/reseller/dashboard");
  return { id: requestId };
}
