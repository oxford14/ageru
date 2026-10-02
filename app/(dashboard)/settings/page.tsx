import { ArrowUpRight } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { requireOwner } from "@/lib/auth/owner";
import { fetchComboPlans } from "@/lib/combo/plans";
import { getCatalog, getPanelConfig, tryGetBalance } from "@/lib/panel";
import { formatCurrency, formatNumber, timeAgo } from "@/lib/panel/shared";
import { ComboPlansEditor } from "@/components/settings/combo-plans-editor";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const user = await requireOwner();
  const cfg = getPanelConfig();
  const balance = await tryGetBalance();
  const catalog = cfg ? await getCatalog().catch(() => null) : null;
  const catalogAt = getCatalog.fetchedAt();
  const cronReady = !!process.env.CRON_SECRET?.trim();
  const comboPlans = await fetchComboPlans().catch(() => []);

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader title="Settings" />

      <Section title="Panel connection" description="Orders, prices and balance come straight from this panel.">
        <Row label="Panel">{cfg?.name ?? "—"}</Row>
        <Row label="API endpoint">
          <span className="font-mono text-[13px]">{cfg?.apiUrl ?? "Not set"}</span>
          {cfg?.apiVersion ? (
            <span className="ml-2 text-muted-foreground">({cfg.apiVersion})</span>
          ) : null}
        </Row>
        <Row label="Status">
          {!cfg ? (
            <span className="text-destructive">Not configured</span>
          ) : balance.ok ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-success" />
              Connected
            </span>
          ) : (
            <span className="text-destructive">{balance.error}</span>
          )}
        </Row>
        {balance.ok ? (
          <Row label="Balance">
            <span className="tabular-nums">{formatCurrency(balance.balance, balance.currency)}</span>
            {cfg?.topUpUrl ? (
              <a
                href={cfg.topUpUrl}
                target="_blank"
                rel="noreferrer"
                className="ml-3 inline-flex items-center gap-0.5 text-[13px] font-medium text-primary hover:underline"
              >
                Add funds <ArrowUpRight className="size-3.5" />
              </a>
            ) : null}
          </Row>
        ) : null}
        <Row label="Service list">
          {catalog ? `${formatNumber(catalog.length)} services` : "—"}
          {catalogAt ? (
            <span className="text-muted-foreground"> · refreshed {timeAgo(new Date(catalogAt).toISOString())}, every 10 min</span>
          ) : null}
        </Row>
        {!cfg ? (
          <p className="px-4 pb-4 text-[13px] leading-relaxed text-muted-foreground">
            Add <code className="font-mono">PROVIDER_API_URL</code> and{" "}
            <code className="font-mono">PROVIDER_API_KEY</code> to <code className="font-mono">.env.local</code>{" "}
            and restart the server. The key never leaves the server.
          </p>
        ) : null}
      </Section>

      <Section title="Combo plans" description="Pre-configure multi-service bundles for the Combos page.">
        <ComboPlansEditor initialPlans={comboPlans} services={catalog ?? []} />
      </Section>

      <Section
        title="Order monitoring"
        description="How order progress stays up to date."
      >
        <Row label="While the app is open">Checked every 45 seconds</Row>
        <Row label="In the background">
          {cronReady ? (
            "Every 5 minutes via the cron job (when deployed on Vercel)"
          ) : (
            <span className="text-muted-foreground">
              Off. Set <code className="font-mono">CRON_SECRET</code> and deploy to Vercel to check every 5 minutes.
            </span>
          )}
        </Row>
      </Section>

      <Section title="Account">
        <Row label="Email">{user.email}</Row>
        <div className="flex justify-end px-4 py-3">
          <form action={signOut}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold">{title}</h2>
      {description ? <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p> : null}
      <div className="mt-3 divide-y rounded-lg border bg-card">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}
