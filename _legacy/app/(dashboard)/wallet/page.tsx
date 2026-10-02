import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DepositForm } from "@/components/wallet/deposit-form";

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ deposit?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const supabase = await createClient();
  const { data: wallet } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Wallet</h1>
      {params.deposit === "success" && (
        <p className="text-sm text-emerald-600">Payment received — balance updates after webhook confirmation.</p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Balance</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-bold">{formatMoney(wallet?.balance ?? "0")}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Deposit funds</CardTitle>
        </CardHeader>
        <CardContent>
          <DepositForm />
        </CardContent>
      </Card>
    </div>
  );
}
