import { requireReseller } from "@/lib/auth/roles";
import { formatMoney } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export default async function ResellerRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await requireReseller();
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("reseller_requests")
    .select("id, quantity, target_url, amount_php, status, created_at, service_id")
    .eq("reseller_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const serviceIds = [...new Set((rows ?? []).map((r) => r.service_id))];
  const { data: services } = serviceIds.length
    ? await supabase.from("reseller_services").select("id, name").in("id", serviceIds)
    : { data: [] };
  const nameById = new Map((services ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track fulfillment status.</p>
      </div>
      {sp.created ? (
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          Request submitted. It will appear in the queue for processing.
        </p>
      ) : null}
      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Charged</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="px-4 py-3 text-muted-foreground">
                  {format(new Date(row.created_at), "MMM d, yyyy")}
                </td>
                <td className="px-4 py-3">{nameById.get(row.service_id) ?? "Service"}</td>
                <td className="px-4 py-3 tabular-nums">{row.quantity.toLocaleString()}</td>
                <td className="px-4 py-3 capitalize">{row.status.replace("_", " ")}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatMoney(row.amount_php, "PHP")}
                </td>
              </tr>
            ))}
            {!rows?.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No requests yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
