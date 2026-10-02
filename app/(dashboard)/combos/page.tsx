import Link from "next/link";
import { requireOwner } from "@/lib/auth/owner";
import { fetchComboPlans } from "@/lib/combo/plans";
import { getCatalog, getPanelConfig, tryGetBalance } from "@/lib/panel";
import { ComboPlansGrid } from "@/components/combos/combo-plans-grid";
import { PageHeader } from "@/components/app/page-header";

export default async function CombosPage() {
  await requireOwner();
  const cfg = getPanelConfig();
  const balanceTry = await tryGetBalance();
  const balance = balanceTry.ok ? balanceTry.balance : null;
  const currency = balanceTry.ok ? balanceTry.currency : cfg ? "USD" : "USD";
  const catalog = cfg ? await getCatalog().catch(() => []) : [];
  const plans = (await fetchComboPlans({ activeOnly: true })).filter((p) => p.items.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Combos"
        description="Run several panel services in one go — each line becomes its own order."
      />

      {!cfg ? (
        <p className="text-sm text-muted-foreground">
          Connect your panel in Settings before using combos.
        </p>
      ) : plans.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-16 text-center">
          <p className="text-sm font-medium">No combo plans yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create one under{" "}
            <Link href="/settings" className="text-primary hover:underline">
              Settings → Combo plans
            </Link>
            .
          </p>
          <Link
            href="/settings"
            className="mt-4 inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
          >
            Open settings
          </Link>
        </div>
      ) : (
        <ComboPlansGrid
          plans={plans}
          services={catalog}
          currency={currency}
          balance={balance}
        />
      )}
    </div>
  );
}
