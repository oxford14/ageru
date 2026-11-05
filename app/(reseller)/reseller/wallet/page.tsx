import Link from "next/link";
import { requireReseller } from "@/lib/auth/roles";
import { formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export default async function ResellerWalletPage({
  searchParams,
}: {
  searchParams: Promise<{ deposit?: string }>;
}) {
  const user = await requireReseller();
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Wallet</h1>
          <p className="mt-1 text-sm text-muted-foreground">All amounts are in Philippine pesos (PHP).</p>
        </div>
        <Link
          href="/reseller/wallet/fund"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Fund account
        </Link>
      </div>

      {sp.deposit === "success" ? (
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          Payment submitted. Your balance updates after Starpago confirms the deposit (usually within a
          minute).
        </p>
      ) : null}
      {sp.deposit === "canceled" ? (
        <p className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">Deposit canceled.</p>
      ) : null}

      <div className="rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">Current balance</p>
        <p className="mt-2 text-4xl font-semibold tabular-nums">
          {formatMoney(wallet?.balance ?? "0", "PHP")}
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        <Link href="/reseller/transactions" className="font-medium text-primary hover:underline">
          View transaction history
        </Link>
      </p>
    </div>
  );
}
