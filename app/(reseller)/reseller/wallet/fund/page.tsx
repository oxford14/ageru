import { requireReseller } from "@/lib/auth/roles";
import { createFundDepositAction } from "@/app/actions/wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function FundWalletPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireReseller();
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Fund account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pay via Starpago. Credits apply after the webhook confirms payment.
        </p>
      </div>
      {sp.error ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {sp.error}
        </p>
      ) : null}
      <form action={createFundDepositAction} className="space-y-4 rounded-xl border bg-card p-6">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount (PHP)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min="50"
            step="1"
            required
            placeholder="500"
          />
        </div>
        <Button type="submit" className="w-full">
          Continue to payment
        </Button>
      </form>
    </div>
  );
}
