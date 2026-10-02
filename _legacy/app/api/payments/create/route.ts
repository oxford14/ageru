import { jsonOk, jsonError } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/require-user";
import { depositSchema } from "@/lib/validators/orders";
import { createDepositPayment } from "@/lib/services/payment.service";
import { money } from "@/lib/money";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const parsed = depositSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid amount");
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const payment = await createDepositPayment({
      userId: user.id,
      amount: money(parsed.data.amount).toFixed(4),
      idempotencyKey: parsed.data.idempotencyKey,
      appUrl,
    });

    return jsonOk({
      paymentId: payment.id,
      checkoutUrl: payment.checkout_url,
      status: payment.status,
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Payment failed", 500);
  }
}
