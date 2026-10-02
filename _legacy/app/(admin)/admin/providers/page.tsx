import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeProvider } from "@/lib/admin/provider-dto";
import { ensureEnvSmmProvider, getEnvProviderConfig } from "@/lib/providers/ensure-env-provider";
import { formatMoney } from "@/lib/money";
import { ProviderForm } from "@/components/admin/provider-form";
import { ProviderActions } from "@/components/admin/provider-actions";

export default async function AdminProvidersPage() {
  await requireAdmin();
  const envCfg = getEnvProviderConfig();
  const envSync = envCfg ? await ensureEnvSmmProvider().catch(() => null) : null;

  const supabase = createAdminClient();
  const { data: providers } = await supabase.from("providers").select("*").order("priority", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Providers</h1>
      {envCfg ? (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          <p className="font-medium">SMM API from environment</p>
          <p className="mt-1 text-muted-foreground">
            {envSync?.synced
              ? `Connected to ${envCfg.name} (${envCfg.apiUrl}). Import services under Admin → Services → Import.`
              : envSync && !envSync.synced && envSync.reason === "missing_encryption_key"
                ? "Set ENCRYPTION_KEY in .env.local and restart the dev server."
                : "Could not sync — check ENCRYPTION_KEY and Supabase credentials."}
          </p>
        </div>
      ) : null}
      <ProviderForm />
      <div className="space-y-3">
        {(providers ?? []).map((p) => {
          const safe = sanitizeProvider(p);
          return (
            <div key={p.id} className="border rounded-lg p-4 text-sm space-y-2">
              <div className="flex justify-between gap-2 flex-wrap">
                <p className="font-medium">{safe.name}</p>
                <span className="text-muted-foreground">{safe.type}</span>
              </div>
              <p>
                Balance: {safe.last_balance != null ? formatMoney(safe.last_balance) : "—"} · Health:{" "}
                {safe.health_status}
              </p>
              <p>Markup: {safe.markup_percentage}% · Enabled: {safe.enabled ? "Yes" : "No"}</p>
              <ProviderActions providerId={p.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
