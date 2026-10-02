import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMoney, calculateCharge } from "@/lib/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminServicesPage() {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: services } = await supabase
    .from("services")
    .select("*, platforms(name), categories(name)")
    .order("name");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Services</h1>
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Provider rate</TableHead>
              <TableHead>Customer rate</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(services ?? []).map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.name}</TableCell>
                <TableCell>{(s.platforms as { name: string })?.name}</TableCell>
                <TableCell>{formatMoney(calculateCharge(s.provider_rate, 1000))}/1k</TableCell>
                <TableCell>{formatMoney(calculateCharge(s.customer_rate, 1000))}/1k</TableCell>
                <TableCell>{s.active ? "Yes" : "No"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
