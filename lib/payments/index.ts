import { StarpagoProvider } from "@/lib/payments/starpago-provider";
import type { PaymentProvider } from "@/lib/payments/types";

export function getPaymentProvider(): PaymentProvider {
  const name = (process.env.PAYMENT_PROVIDER ?? "starpago").toLowerCase();
  if (name === "starpago") return new StarpagoProvider();
  throw new Error(`Unsupported PAYMENT_PROVIDER: ${name}`);
}
