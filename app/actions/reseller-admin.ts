"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth/roles";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { createAdminClient } from "@/lib/supabase/admin";
import { money } from "@/lib/money";

const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  unitLabel: z.string().max(40).default("units"),
  minQuantity: z.coerce.number().int().min(1),
  maxQuantity: z.coerce.number().int().min(1),
  pricePerThousand: z.string(),
  active: z.coerce.boolean().optional(),
});

const offerSchema = z.object({
  id: z.string().uuid().optional(),
  providerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  costPerThousand: z.string(),
  active: z.coerce.boolean().optional(),
});

export async function upsertResellerServiceAction(input: z.input<typeof serviceSchema>) {
  const adminUser = await requireSuperAdmin();
  const data = serviceSchema.parse(input);
  const admin = createAdminClient();
  const now = new Date().toISOString();

  let serviceId = data.id;
  if (serviceId) {
    await admin
      .from("reseller_services")
      .update({
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        unit_label: data.unitLabel,
        min_quantity: data.minQuantity,
        max_quantity: data.maxQuantity,
        active: data.active ?? true,
        updated_at: now,
      })
      .eq("id", serviceId);
  } else {
    const { data: created, error } = await admin
      .from("reseller_services")
      .insert({
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        unit_label: data.unitLabel,
        min_quantity: data.minQuantity,
        max_quantity: data.maxQuantity,
        active: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    serviceId = created.id;
  }

  await admin.from("reseller_service_prices").upsert(
    {
      service_id: serviceId,
      price_per_unit: data.pricePerThousand,
      active: true,
      updated_at: now,
    },
    { onConflict: "service_id" }
  );

  await logAdminAction({
    adminId: adminUser.id,
    action: "reseller_service_upsert",
    entityType: "reseller_service",
    entityId: serviceId,
    metadata: { slug: data.slug },
  });

  revalidatePath("/reseller-pricing");
  revalidatePath("/reseller/services");
}

export async function upsertProviderOfferAction(input: z.input<typeof offerSchema>) {
  const adminUser = await requireSuperAdmin();
  const data = offerSchema.parse(input);
  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (data.id) {
    await admin
      .from("provider_service_offers")
      .update({
        provider_id: data.providerId,
        service_id: data.serviceId,
        cost_per_unit: data.costPerThousand,
        active: data.active ?? true,
        updated_at: now,
      })
      .eq("id", data.id);
  } else {
    await admin.from("provider_service_offers").insert({
      provider_id: data.providerId,
      service_id: data.serviceId,
      cost_per_unit: data.costPerThousand,
      active: true,
    });
  }

  await logAdminAction({
    adminId: adminUser.id,
    action: "provider_offer_upsert",
    entityType: "provider_service_offer",
    entityId: data.id ?? data.serviceId,
  });

  revalidatePath("/reseller-pricing");
}

export async function fulfillResellerRequestAction(input: {
  requestId: string;
  providerOfferId: string;
  markCompleted?: boolean;
}) {
  const adminUser = await requireSuperAdmin();
  const admin = createAdminClient();

  const { data: request } = await admin
    .from("reseller_requests")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle();
  if (!request || request.status !== "pending") {
    throw new Error("Request not found or not pending");
  }

  const { data: offer } = await admin
    .from("provider_service_offers")
    .select("*")
    .eq("id", input.providerOfferId)
    .eq("active", true)
    .maybeSingle();
  if (!offer) throw new Error("Provider offer not found");

  await admin
    .from("reseller_requests")
    .update({
      status: "processing",
      provider_id: offer.provider_id,
      provider_offer_id: offer.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  if (input.markCompleted) {
    await admin
      .from("reseller_requests")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", request.id);
  }

  await logAdminAction({
    adminId: adminUser.id,
    action: "reseller_request_fulfill",
    entityType: "reseller_request",
    entityId: input.requestId,
    metadata: { providerOfferId: input.providerOfferId },
  });

  revalidatePath("/reseller-requests");
}

export async function failResellerRequestAction(input: { requestId: string; reason: string }) {
  const adminUser = await requireSuperAdmin();
  const admin = createAdminClient();

  const { data: request } = await admin
    .from("reseller_requests")
    .select("*")
    .eq("id", input.requestId)
    .maybeSingle();
  if (!request) throw new Error("Request not found");
  if (request.status === "completed" || request.status === "refunded") {
    throw new Error("Request already finalized");
  }

  const amountNum = money(request.amount_php).toNumber();
  await admin.rpc("wallet_refund_reseller_request", {
    p_user_id: request.reseller_id,
    p_amount: amountNum,
    p_request_id: request.id,
    p_idempotency_key: `reseller-request-refund-${request.idempotency_key}`,
  });

  await admin
    .from("reseller_requests")
    .update({
      status: "failed",
      failure_reason: input.reason.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  await logAdminAction({
    adminId: adminUser.id,
    action: "reseller_request_fail_refund",
    entityType: "reseller_request",
    entityId: input.requestId,
    metadata: { reason: input.reason },
  });

  revalidatePath("/reseller-requests");
}

export async function completeResellerRequestAction(requestId: string) {
  const adminUser = await requireSuperAdmin();
  const admin = createAdminClient();
  await admin
    .from("reseller_requests")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", requestId);

  await logAdminAction({
    adminId: adminUser.id,
    action: "reseller_request_complete",
    entityType: "reseller_request",
    entityId: requestId,
  });

  revalidatePath("/reseller-requests");
}
