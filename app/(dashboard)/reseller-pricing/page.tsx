import { requireSuperAdmin } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { ResellerPricingForms } from "@/components/reseller/reseller-pricing-forms";

export default async function ResellerPricingPage() {
  await requireSuperAdmin();
  const admin = createAdminClient();

  const [{ data: services }, { data: prices }, { data: providers }, { data: offers }] =
    await Promise.all([
      admin.from("reseller_services").select("*").order("sort_order"),
      admin.from("reseller_service_prices").select("*"),
      admin.from("providers").select("id, name").eq("enabled", true),
      admin.from("provider_service_offers").select("*"),
    ]);

  return (
    <div className="space-y-8 p-6 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Reseller pricing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reseller-facing prices and internal provider costs (PHP per 1,000 units).
        </p>
      </div>
      <ResellerPricingForms
        services={services ?? []}
        prices={prices ?? []}
        providers={providers ?? []}
        offers={offers ?? []}
      />
    </div>
  );
}
