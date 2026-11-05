import { money } from "@/lib/money";
import { starpagoSignPayload, verifyStarpagoSign } from "@/lib/payments/starpago-sign";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  VerifyWebhookResult,
} from "@/lib/payments/types";

const DEFAULT_HOST = "https://api.starpago.com";

export class StarpagoProvider implements PaymentProvider {
  readonly name = "starpago";

  private appId() {
    const id = process.env.STARPAGO_APP_ID;
    if (!id) throw new Error("STARPAGO_APP_ID is not configured");
    return id;
  }

  private secretKey() {
    const key = process.env.STARPAGO_SECRET_KEY;
    if (!key) throw new Error("STARPAGO_SECRET_KEY is not configured");
    return key;
  }

  private apiHost() {
    return (process.env.STARPAGO_API_HOST ?? DEFAULT_HOST).replace(/\/$/, "");
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const amount = money(input.amount).toNumber();
    if (amount <= 0) throw new Error("Amount must be positive");

    const merOrderNo = input.idempotencyKey.slice(0, 64);
    const notifyUrl = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")}/api/payments/starpago/webhook`;
    const returnUrl = input.successUrl;

    const body: Record<string, unknown> = {
      appId: this.appId(),
      merOrderNo,
      currency: input.currency,
      amount,
      notifyUrl,
      returnUrl,
      attach: JSON.stringify({
        user_id: input.userId,
        idempotency_key: input.idempotencyKey,
      }),
    };

    body.sign = starpagoSignPayload(body, this.secretKey());

    const res = await fetch(`${this.apiHost()}/api/v2/payment/order/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as {
      code?: number;
      msg?: string;
      error?: string;
      data?: Record<string, unknown>;
    };

    if (!res.ok || (json.code !== undefined && json.code !== 0 && json.code !== 200)) {
      throw new Error(json.msg ?? json.error ?? "Starpago checkout failed");
    }

    const data = (json.data ?? json) as Record<string, unknown>;
    const orderNo = String(data.orderNo ?? data.order_no ?? merOrderNo);
    const checkoutUrl =
      typeof data.params === "object" && data.params !== null
        ? String((data.params as { url?: string }).url ?? "")
        : String(data.url ?? "");

    if (!checkoutUrl) {
      throw new Error("Starpago did not return a checkout URL");
    }

    return {
      checkoutUrl,
      externalId: orderNo,
      status: "pending",
    };
  }

  async verifyWebhook(rawBody: string, _headers: Headers): Promise<VerifyWebhookResult> {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return { valid: false };
    }

    if (!verifyStarpagoSign(payload, this.secretKey())) {
      return { valid: false };
    }

    const orderStatus = Number(payload.orderStatus);
    const paid = orderStatus === 2 || orderStatus === 3;
    if (!paid) {
      return {
        valid: true,
        eventId: String(payload.orderNo ?? payload.merOrderNo ?? ""),
        status: "pending",
      };
    }

    const paidAmount = payload.paidAmount ?? payload.amount;
    const amount =
      paidAmount !== undefined && paidAmount !== null
        ? money(String(paidAmount)).toFixed(2)
        : undefined;

    let userId: string | undefined;
    let idempotencyKey: string | undefined;
    const attach = payload.attach;
    if (typeof attach === "string" && attach.startsWith("{")) {
      try {
        const meta = JSON.parse(attach) as { user_id?: string; idempotency_key?: string };
        userId = meta.user_id;
        idempotencyKey = meta.idempotency_key;
      } catch {
        /* ignore */
      }
    }

    const merOrderNo = payload.merOrderNo;
    if (!idempotencyKey && typeof merOrderNo === "string") {
      idempotencyKey = merOrderNo;
    }

    return {
      valid: true,
      eventId: String(payload.orderNo ?? merOrderNo ?? ""),
      status: "paid",
      amount,
      userId,
      idempotencyKey,
    };
  }
}
