import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type MoneyString = string;

export function money(value: string | number | Decimal): Decimal {
  return new Decimal(value);
}

/** Rate is per 1000 units */
export function calculateCharge(
  customerRate: string,
  quantity: number
): MoneyString {
  return money(customerRate)
    .mul(quantity)
    .div(1000)
    .toFixed(4);
}

export function formatMoney(
  amount: string | number,
  currency: string = "PHP"
): string {
  const num = money(amount).toNumber();
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function applyMarkup(
  providerRate: string,
  markupPercentage: string
): MoneyString {
  return money(providerRate)
    .mul(money(1).plus(money(markupPercentage).div(100)))
    .toFixed(4);
}
