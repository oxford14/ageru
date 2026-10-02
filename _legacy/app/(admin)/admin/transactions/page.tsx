import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminTransactionsPage() {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, profiles(email)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Transactions</h1>
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(transactions ?? []).map((tx) => (
              <TableRow key={tx.id}>
                <TableCell>{(tx.profiles as { email: string })?.email}</TableCell>
                <TableCell>{tx.type}</TableCell>
                <TableCell>{formatMoney(tx.amount)}</TableCell>
                <TableCell>{tx.status}</TableCell>
                <TableCell>{new Date(tx.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
