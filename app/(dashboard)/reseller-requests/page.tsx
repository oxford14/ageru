import { requireSuperAdmin } from "@/lib/auth/roles";
import { formatMoney } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { ResellerRequestAdminRow } from "@/components/reseller/reseller-request-admin-row";

export default async function ResellerRequestsAdminPage() {
  await requireSuperAdmin();
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from("reseller_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const serviceIds = [...new Set((rows ?? []).map((r) => r.service_id))];
  const resellerIds = [...new Set((rows ?? []).map((r) => r.reseller_id))];

  const [{ data: services }, { data: profiles }, { data: offers }] = await Promise.all([
    serviceIds.length
      ? admin.from("reseller_services").select("id, name").in("id", serviceIds)
      : Promise.resolve({ data: [] }),
    resellerIds.length
      ? admin.from("profiles").select("id, email, username").in("id", resellerIds)
      : Promise.resolve({ data: [] }),
    admin.from("provider_service_offers").select("id, provider_id, service_id, cost_per_unit").eq("active", true),
  ]);

  const serviceName = new Map((services ?? []).map((s) => [s.id, s.name]));
  const resellerLabel = new Map(
    (profiles ?? []).map((p) => [p.id, p.username ?? p.email])
  );

  return (
    <div className="space-y-6 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Reseller requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign provider offers, complete, or refund failed fulfillments.
        </p>
      </div>
      <div className="space-y-3">
        {(rows ?? []).map((row) => (
          <ResellerRequestAdminRow
            key={row.id}
            request={row}
            serviceName={serviceName.get(row.service_id) ?? "Service"}
            resellerLabel={resellerLabel.get(row.reseller_id) ?? "Reseller"}
            amountLabel={formatMoney(row.amount_php, "PHP")}
            offers={(offers ?? []).filter((o) => o.service_id === row.service_id)}
          />
        ))}
        {!rows?.length ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No reseller requests yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}
