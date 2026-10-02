import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ServiceImportForm } from "@/components/admin/service-import-form";

export default async function ImportServicesPage() {
  await requireAdmin();
  const supabase = createAdminClient();
  const [{ data: providers }, { data: platforms }, { data: categories }] =
    await Promise.all([
      supabase.from("providers").select("id, name").eq("enabled", true),
      supabase.from("platforms").select("id, name"),
      supabase.from("categories").select("id, platform_id, name"),
    ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Import Provider Services</h1>
      <ServiceImportForm
        providers={providers ?? []}
        platforms={platforms ?? []}
        categories={categories ?? []}
      />
    </div>
  );
}
