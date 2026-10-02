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

  if (existing) {
    return existing;
  }

  const result = await paymentProvider.createPayment({
    userId: input.userId,
    amount: input.amount,
    currency: "PHP",
    idempotencyKey: input.idempotencyKey,
    description: "Wallet deposit",
    successUrl: `${input.appUrl}/wallet?deposit=success`,
    cancelUrl: `${input.appUrl}/wallet?deposit=canceled`,
  });

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      user_id: input.userId,
      provider: paymentProvider.name,
      external_id: result.externalId,
      checkout_url: result.checkoutUrl,
      amount: input.amount,
      currency: "PHP",
      status: result.status === "paid" ? "paid" : "pending",
      idempotency_key: input.idempotencyKey,
    })
    .select("*")
    .single();

  if (error) throw error;

  if (result.status === "paid" && payment) {
    await creditWalletFromPayment(payment.id, input.userId, input.amount, input.idempotencyKey);
  }

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

  const { data: creditRows, error: rpcError } = await supabase.rpc(
    "wallet_credit_deposit",
    {
      p_user_id: userId,
      p_amount: money(amount).toNumber(),
      p_idempotency_key: `deposit-${idempotencyKey}`,
      p_description: "Wallet deposit",
    }
  );

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

export async function handlePaymentWebhook(rawBody: string, headers: Headers) {
  const supabase = createAdminClient();
  const provider = getPaymentProvider();
  const verified = await provider.verifyWebhook(rawBody, headers);
  if (!verified.valid || !verified.eventId) {
    return { processed: false };
  }

  const { data: existingEvent } = await supabase
    .from("payments")
    .select("id")
    .eq("webhook_event_id", verified.eventId)
    .maybeSingle();

  if (existingEvent) {
    return { processed: true, duplicate: true };
  }

  const payload = JSON.parse(rawBody);
  const metadata =
    payload?.data?.attributes?.data?.attributes?.metadata ??
    payload?.data?.attributes?.metadata ??
    {};

  const userId = metadata.user_id as string | undefined;
  const idempotencyKey = metadata.idempotency_key as string | undefined;
  const amount = verified.amount;

  if (!userId || !idempotencyKey || !amount || verified.status !== "paid") {
    return { processed: false };
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("*")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (!payment) return { processed: false };

  await supabase
    .from("payments")
    .update({ webhook_event_id: verified.eventId })
    .eq("id", payment.id);

  await creditWalletFromPayment(payment.id, userId, amount, idempotencyKey);

  return { processed: true };
}
