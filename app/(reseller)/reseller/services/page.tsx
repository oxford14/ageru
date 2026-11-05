import Link from "next/link";
import { requireReseller } from "@/lib/auth/roles";
import { formatMoney, calculateCharge } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export default async function ResellerServicesPage() {
  await requireReseller();
  const supabase = await createClient();

  const { data: services } = await supabase
    .from("reseller_services")
    .select("id, name, description, unit_label, min_quantity, max_quantity")
    .eq("active", true)
    .order("sort_order");

  const ids = (services ?? []).map((s) => s.id);
  const { data: prices } = ids.length
    ? await supabase
        .from("reseller_service_prices")
        .select("service_id, price_per_unit")
        .in("service_id", ids)
        .eq("active", true)
    : { data: [] };

  const priceById = new Map((prices ?? []).map((p) => [p.service_id, p.price_per_unit]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Services</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Prices are per 1,000 {`units`}. You pay from your PHP wallet when you submit a request.
        </p>
      </div>
      <div className="grid gap-4">
        {(services ?? []).map((service) => {
          const rate = priceById.get(service.id);
          if (!rate) return null;
          const sample = calculateCharge(rate, service.min_quantity);
          return (
            <div key={service.id} className="flex flex-wrap items-start justify-between gap-4 rounded-xl border p-5">
              <div>
                <h2 className="font-semibold">{service.name}</h2>
                {service.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{service.description}</p>
                ) : null}
                <p className="mt-2 text-sm tabular-nums">
                  From {formatMoney(sample, "PHP")} (min {service.min_quantity.toLocaleString()}{" "}
                  {service.unit_label})
                </p>
                <p className="text-xs text-muted-foreground">
                  Rate: {formatMoney(rate, "PHP")} / 1k · max {service.max_quantity.toLocaleString()}
                </p>
              </div>
              <Link
                href={`/reseller/services/new?service=${service.id}`}
                className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
              >
                New request
              </Link>
            </div>
          );
        })}
        {!services?.length ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No services are available yet. Check back soon.
          </p>
        ) : null}
      </div>
    </div>
  );
}
