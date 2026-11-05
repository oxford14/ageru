import { requireReseller } from "@/lib/auth/roles";
import { formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export default async function ResellerTransactionsPage() {
  const user = await requireReseller();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Wallet ledger (PHP).</p>
      </div>
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((tx) => (
              <tr key={tx.id} className="border-b last:border-0">
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {format(new Date(tx.created_at), "MMM d, yyyy HH:mm")}
                </td>
                <td className="px-4 py-3 capitalize">{tx.type}</td>
                <td className="px-4 py-3">{tx.description ?? "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">
                  {formatMoney(tx.amount, "PHP")}
                </td>
              </tr>
            ))}
            {!rows?.length ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No transactions yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
