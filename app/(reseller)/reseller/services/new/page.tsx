import Link from "next/link";
import { notFound } from "next/navigation";
import { requireReseller } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NewRequestForm } from "@/components/reseller/new-request-form";

export default async function NewResellerServiceRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  await requireReseller();
  const { service: serviceId } = await searchParams;
  if (!serviceId) {
    return (
      <p className="text-sm text-muted-foreground">
        Pick a service from the{" "}
        <Link href="/reseller/services" className="text-primary hover:underline">
          catalog
        </Link>
        .
      </p>
    );
  }

  const supabase = await createClient();
  const { data: service } = await supabase
    .from("reseller_services")
    .select("*")
    .eq("id", serviceId)
    .eq("active", true)
    .maybeSingle();
  if (!service) notFound();

  const { data: price } = await supabase
    .from("reseller_service_prices")
    .select("price_per_unit")
    .eq("service_id", serviceId)
    .eq("active", true)
    .maybeSingle();
  if (!price) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">New request</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your wallet is charged when you submit.</p>
      </div>
      <NewRequestForm
        serviceId={service.id}
        serviceName={service.name}
        minQuantity={service.min_quantity}
        maxQuantity={service.max_quantity}
      />
    </div>
  );
}
