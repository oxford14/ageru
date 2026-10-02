export interface CreatePaymentInput {
  userId: string;
  amount: string;
  currency: string;
  idempotencyKey: string;
  description?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreatePaymentResult {
  paymentId: string;
  checkoutUrl: string | null;
  externalId: string | null;
  status: "pending" | "paid";
}

export interface VerifyWebhookResult {
  valid: boolean;
  eventId?: string;
  paymentExternalId?: string;
  amount?: string;
  status?: "paid" | "failed";
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyWebhook(
    rawBody: string,
    headers: Headers
  ): Promise<VerifyWebhookResult>;
}
