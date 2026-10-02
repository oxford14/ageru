import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney, money } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/orders/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const supabase = createAdminClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    { count: users },
    { count: totalOrders },
    { count: todayOrders },
    { count: pendingOrders },
    { count: completedOrders },
    { data: recentOrders },
    { data: providers },
    { data: allOrders },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString()),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "processing", "in_progress"]),
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase
      .from("orders")
      .select("*, services(name), profiles(email)")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("providers").select("*").order("priority", { ascending: false }),
    supabase.from("orders").select("customer_charge, provider_cost, profit"),
  ]);

  let revenue = money(0);
  let providerCost = money(0);
  let profit = money(0);
  for (const o of allOrders ?? []) {
    revenue = revenue.plus(o.customer_charge);
    providerCost = providerCost.plus(o.provider_cost);
    profit = profit.plus(o.profit);
  }

  const lowBalanceProviders = (providers ?? []).filter(
    (p) => p.last_balance != null && Number(p.last_balance) < 100
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total Users", users ?? 0],
          ["Total Orders", totalOrders ?? 0],
          ["Today's Orders", todayOrders ?? 0],
          ["Pending Orders", pendingOrders ?? 0],
          ["Completed Orders", completedOrders ?? 0],
          ["Revenue", formatMoney(revenue.toFixed(4))],
          ["Provider Cost", formatMoney(providerCost.toFixed(4))],
          ["Profit", formatMoney(profit.toFixed(4))],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{value}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Provider status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(providers ?? []).map((p) => (
              <div key={p.id} className="flex justify-between border-b pb-2">
                <span>{p.name}</span>
                <span>
                  {p.health_status} · {p.last_balance != null ? formatMoney(p.last_balance) : "—"}
                </span>
              </div>
            ))}
            {lowBalanceProviders.length > 0 && (
              <p className="text-amber-600 text-xs">
                Low balance warning: {lowBalanceProviders.map((p) => p.name).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recentOrders ?? []).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>#{o.order_number}</TableCell>
                    <TableCell>{(o.profiles as { email: string })?.email}</TableCell>
                    <TableCell>{formatMoney(o.customer_charge)}</TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
