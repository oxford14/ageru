export type CreatePaymentInput = {
  userId: string;
  amount: string;
  currency: string;
  idempotencyKey: string;
  description?: string;
  successUrl: string;
  cancelUrl: string;
};

export type CreatePaymentResult = {
  paymentId?: string;
  checkoutUrl: string;
  externalId: string;
  status: "pending" | "paid";
};

export type VerifyWebhookResult = {
  valid: boolean;
  eventId?: string;
  status?: "paid" | "failed" | "pending";
  amount?: string;
  idempotencyKey?: string;
  userId?: string;
};

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<VerifyWebhookResult>;
}
