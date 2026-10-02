import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "@/components/orders/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const supabase = createAdminClient();

  let query = supabase
    .from("orders")
    .select("*, services(name), profiles(email, username)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (params.search) {
    query = query.or(
      `order_number.ilike.%${params.search}%,provider_order_id.ilike.%${params.search}%,target_url.ilike.%${params.search}%`
    );
  }

  const { data: orders } = await query;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <form>
        <input
          name="search"
          defaultValue={params.search}
          placeholder="Search orders..."
          className="border rounded-md px-3 py-2 text-sm bg-background"
        />
      </form>
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Charge</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Profit</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(orders ?? []).map((o) => (
              <TableRow key={o.id}>
                <TableCell>#{o.order_number}</TableCell>
                <TableCell>{(o.profiles as { email: string })?.email}</TableCell>
                <TableCell>{(o.services as { name: string })?.name}</TableCell>
                <TableCell>{o.quantity}</TableCell>
                <TableCell>{formatMoney(o.customer_charge)}</TableCell>
                <TableCell>{formatMoney(o.provider_cost)}</TableCell>
                <TableCell>{formatMoney(o.profit)}</TableCell>
                <TableCell>
                  <StatusBadge status={o.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
