import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  VerifyWebhookResult,
} from "@/lib/payments/types";

/** Dev-only instant deposit when PAYMENT_PROVIDER=manual */
export class ManualPaymentProvider implements PaymentProvider {
  readonly name = "manual";

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Manual payment provider is disabled in production");
    }
    return {
      paymentId: input.idempotencyKey,
      checkoutUrl: null,
      externalId: `manual-${input.idempotencyKey}`,
      status: "paid",
    };
  }

  async verifyWebhook(): Promise<VerifyWebhookResult> {
    return { valid: false };
  }
}
