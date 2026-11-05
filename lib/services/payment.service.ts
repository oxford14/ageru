import { getPaymentProvider } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { money } from "@/lib/money";

export async function createDepositPayment(input: {
  userId: string;
  amount: string;
  idempotencyKey: string;
  appUrl: string;
}) {
  const supabase = createAdminClient();
  const paymentProvider = getPaymentProvider();

  const { data: existing } = await supabase
    .from("payments")
    .select("*")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (existing?.checkout_url) {
    return existing;
  }

  const result = await paymentProvider.createPayment({
    userId: input.userId,
    amount: input.amount,
    currency: "PHP",
    idempotencyKey: input.idempotencyKey,
    description: "Wallet deposit",
    successUrl: `${input.appUrl}/reseller/wallet?deposit=success`,
    cancelUrl: `${input.appUrl}/reseller/wallet?deposit=canceled`,
  });

  if (existing) {
    await supabase
      .from("payments")
      .update({
        external_id: result.externalId,
        checkout_url: result.checkoutUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    return { ...existing, checkout_url: result.checkoutUrl, external_id: result.externalId };
  }

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      user_id: input.userId,
      provider: paymentProvider.name,
      external_id: result.externalId,
      checkout_url: result.checkoutUrl,
      amount: input.amount,
      currency: "PHP",
      status: "pending",
      idempotency_key: input.idempotencyKey,
    })
    .select("*")
    .single();

  if (error) throw error;
  return payment;
}

export async function creditWalletFromPayment(
  paymentId: string,
  userId: string,
  amount: string,
  idempotencyKey: string
) {
  const supabase = createAdminClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();

  if (!payment) return;
  if (payment.status === "paid" && payment.transaction_id) {
    return;
  }

  const { data: creditRows, error: rpcError } = await supabase.rpc("wallet_credit_deposit", {
    p_user_id: userId,
    p_amount: money(amount).toNumber(),
    p_idempotency_key: `deposit-${idempotencyKey}`,
    p_description: "Wallet deposit",
  });

  if (rpcError) throw rpcError;

  const rows = (
    Array.isArray(creditRows) ? creditRows : creditRows ? [creditRows] : []
  ) as { transaction_id: string; new_balance: number }[];
  const txId = rows[0]?.transaction_id;

  await supabase
    .from("payments")
    .update({
      status: "paid",
      transaction_id: txId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId);
}

export async function handleStarpagoWebhook(rawBody: string, headers: Headers) {
  const supabase = createAdminClient();
  const provider = getPaymentProvider();
  const verified = await provider.verifyWebhook(rawBody, headers);
  if (!verified.valid) {
    return { processed: false };
  }

  if (verified.status !== "paid" || !verified.idempotencyKey || !verified.amount) {
    return { processed: true, skipped: true };
  }

  const { data: existingEvent } = await supabase
    .from("payments")
    .select("id, status, transaction_id")
    .eq("webhook_event_id", verified.eventId ?? "")
    .maybeSingle();

  if (existingEvent?.status === "paid" && existingEvent.transaction_id) {
    return { processed: true, duplicate: true };
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("idempotency_key", verified.idempotencyKey)
    .maybeSingle();

  if (!payment) return { processed: false };

  const userId = verified.userId ?? payment.user_id;

  if (verified.eventId) {
    await supabase
      .from("payments")
      .update({ webhook_event_id: verified.eventId })
      .eq("id", payment.id);
  }

  await creditWalletFromPayment(
    payment.id,
    userId,
    verified.amount,
    verified.idempotencyKey
  );

  return { processed: true };
}
