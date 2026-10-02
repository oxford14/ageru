import { requireOwner } from "@/lib/auth/owner";
import { getCatalog, getPanelConfig, tryGetBalance } from "@/lib/panel";
import { formatNumber } from "@/lib/panel/shared";
import { PageHeader } from "@/components/app/page-header";
import { PanelError } from "@/components/app/panel-error";
import { ServicePicker } from "@/components/orders/service-picker";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  await requireOwner();
  const params = await searchParams;
  const cfg = getPanelConfig();
  const [catalog, balance] = await Promise.all([
    getCatalog().then(
      (services) => ({ ok: true as const, services }),
      (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : "Unknown error" })
    ),
    tryGetBalance(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        description={
          catalog.ok
            ? `${formatNumber(catalog.services.length)} services live from ${cfg?.name ?? "the panel"}. Prices are what the panel charges you.`
            : undefined
        }
      />
      {catalog.ok ? (
        <section className="flex h-[calc(100vh-14rem)] min-h-[480px] flex-col overflow-hidden rounded-lg border bg-card">
          <ServicePicker
            services={catalog.services}
            currency={balance.ok ? balance.currency : "USD"}
            initialPlatform={params.platform ?? "all"}
            className="flex-1"
          />
        </section>
      ) : (
        <PanelError message={catalog.error} />
      )}
    </div>
  );
}
