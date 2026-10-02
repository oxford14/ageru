import { jsonOk, jsonError } from "@/lib/api/response";
import { handlePaymentWebhook } from "@/lib/services/payment.service";

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    const result = await handlePaymentWebhook(rawBody, request.headers);
    return jsonOk(result);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Webhook error", 400);
  }
}
