import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  VerifyWebhookResult,
} from "@/lib/payments/types";

const PAYMONGO_API = "https://api.paymongo.com/v1";

export class PayMongoProvider implements PaymentProvider {
  readonly name = "paymongo";

  private secretKey() {
    const key = process.env.PAYMONGO_SECRET_KEY;
    if (!key) throw new Error("PAYMONGO_SECRET_KEY is not configured");
    return key;
  }

  private authHeader() {
    return `Basic ${Buffer.from(`${this.secretKey()}:`).toString("base64")}`;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const amountCentavos = Math.round(parseFloat(input.amount) * 100);

    const res = await fetch(`${PAYMONGO_API}/checkout_sessions`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            billing: {
              name: "SocialBoost Customer",
              email: "customer@example.com",
            },
            line_items: [
              {
                amount: amountCentavos,
                currency: input.currency,
                name: input.description ?? "Wallet deposit",
                quantity: 1,
              },
            ],
            payment_method_types: ["gcash", "grab_pay", "card", "paymaya"],
            success_url: input.successUrl,
            cancel_url: input.cancelUrl,
            metadata: {
              user_id: input.userId,
              idempotency_key: input.idempotencyKey,
            },
          },
        },
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json?.errors?.[0]?.detail ?? "PayMongo checkout failed");
    }

    const attrs = json.data.attributes;
    return {
      paymentId: json.data.id,
      checkoutUrl: attrs.checkout_url,
      externalId: json.data.id,
      status: "pending",
    };
  }

  async verifyWebhook(
    rawBody: string,
    headers: Headers
  ): Promise<VerifyWebhookResult> {
    const signature = headers.get("paymongo-signature");
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
    if (!signature || !webhookSecret) {
      return { valid: false };
    }

    // PayMongo signature: t=timestamp,te=test_sig,li=live_sig
    const parts = Object.fromEntries(
      signature.split(",").map((p) => {
        const [k, v] = p.split("=");
        return [k, v];
      })
    ) as Record<string, string>;

    const timestamp = parts.t;
    const liveSig = parts.li ?? parts.te;
    if (!timestamp || !liveSig) return { valid: false };

    const crypto = await import("crypto");
    const signed = crypto
      .createHmac("sha256", webhookSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    if (signed !== liveSig) return { valid: false };

    const payload = JSON.parse(rawBody);
    const eventId = payload?.data?.id as string | undefined;
    const eventType = payload?.data?.attributes?.type as string | undefined;
    const data = payload?.data?.attributes?.data;

    if (eventType === "checkout.session.payment.paid") {
      const amount = data?.attributes?.amount
        ? String(Number(data.attributes.amount) / 100)
        : undefined;
      return {
        valid: true,
        eventId,
        paymentExternalId: data?.id,
        amount,
        status: "paid",
      };
    }

    return { valid: true, eventId, status: "failed" };
  }
}
