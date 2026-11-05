import Link from "next/link";
import { requireReseller } from "@/lib/auth/roles";
import { formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export default async function ResellerDashboardPage() {
  const user = await requireReseller();
  const supabase = await createClient();

  const [{ data: wallet }, { count: pendingCount }] = await Promise.all([
    supabase.from("wallets").select("balance").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("reseller_requests")
      .select("id", { count: "exact", head: true })
      .eq("reseller_id", user.id)
      .eq("status", "pending"),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Reseller dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse services, submit requests, and pay from your PHP wallet.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Available balance</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {formatMoney(wallet?.balance ?? "0", "PHP")}
          </p>
          <Link
            href="/reseller/wallet/fund"
            className="mt-4 inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            Fund account
          </Link>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Pending requests</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{pendingCount ?? 0}</p>
          <Link
            href="/reseller/requests"
            className="mt-4 inline-flex h-8 items-center justify-center rounded-md border px-3 text-sm font-medium"
          >
            View requests
          </Link>
        </div>
      </div>
    </div>
  );
}
