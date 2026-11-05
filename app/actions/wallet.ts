"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { z } from "zod";
import { requireReseller } from "@/lib/auth/roles";
import { createDepositPayment } from "@/lib/services/payment.service";
import { money } from "@/lib/money";

const fundSchema = z.object({
  amount: z.coerce.number().min(50, "Minimum deposit is ₱50."),
});

export async function createFundDepositAction(formData: FormData) {
  const user = await requireReseller();
  const parsed = fundSchema.safeParse({ amount: formData.get("amount") });
  if (!parsed.success) {
    redirect(
      `/reseller/wallet/fund?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid amount")}`
    );
  }

  const amount = money(parsed.data.amount).toFixed(2);
  const idempotencyKey = randomUUID();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const payment = await createDepositPayment({
      userId: user.id,
      amount,
      idempotencyKey,
      appUrl,
    });
    if (!payment.checkout_url) {
      redirect("/reseller/wallet/fund?error=Checkout%20unavailable");
    }
    redirect(payment.checkout_url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Payment failed";
    redirect(`/reseller/wallet/fund?error=${encodeURIComponent(msg)}`);
  }
}
