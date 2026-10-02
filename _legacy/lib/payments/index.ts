import { ManualPaymentProvider } from "@/lib/payments/manual-payment-provider";
import { PayMongoProvider } from "@/lib/payments/paymongo-provider";
import type { PaymentProvider } from "@/lib/payments/types";

export function getPaymentProvider(): PaymentProvider {
  const provider = process.env.PAYMENT_PROVIDER ?? "manual";
  if (provider === "paymongo") return new PayMongoProvider();
  return new ManualPaymentProvider();
}

export * from "./types";
