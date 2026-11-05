import { handleStarpagoWebhook } from "@/lib/services/payment.service";

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    await handleStarpagoWebhook(rawBody, request.headers);
    return new Response("SUCCESS", { status: 200 });
  } catch {
    return new Response("FAIL", { status: 400 });
  }
}
