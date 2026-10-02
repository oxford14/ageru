import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { requireOwner } from "@/lib/auth/owner";
import { getPanelConfig, tryGetBalance } from "@/lib/panel";
import { formatCurrency, formatNumber, shortLink } from "@/lib/panel/shared";
import { ACTIVE_STATUSES } from "@/lib/services/sync-orders.service";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, SectionTitle } from "@/components/app/page-header";
import { OrdersList, ORDER_LIST_COLUMNS, type OrderListItem } from "@/components/orders/orders-list";
import { OrderSync } from "@/components/orders/order-sync";
import { ComposeButton } from "@/components/composer/composer-provider";

export default async function OverviewPage() {
  const user = await requireOwner();
  const supabase = await createClient();
  const cfg = getPanelConfig();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [balance, { data: active }, { data: recent }, { data: month }, { data: usedRows }] =
    await Promise.all([
      tryGetBalance(),
      supabase
        .from("orders")
        .select(ORDER_LIST_COLUMNS)
        .eq("user_id", user.id)
        .in("status", ACTIVE_STATUSES)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("orders")
        .select(ORDER_LIST_COLUMNS)
        .eq("user_id", user.id)
        .not("status", "in", `(${ACTIVE_STATUSES.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("orders")
        .select("status, customer_charge")
        .eq("user_id", user.id)
        .gte("created_at", monthStart.toISOString()),
      supabase
        .from("orders")
        .select("provider_service_id, service_name, target_url, created_at")
        .eq("user_id", user.id)
        .not("provider_service_id", "is", null)
        .neq("status", "provider_failed")
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

  const activeOrders = (active ?? []) as unknown as OrderListItem[];
  const recentOrders = (recent ?? []) as unknown as OrderListItem[];
  const currency = balance.ok ? balance.currency : "USD";

  const placedThisMonth = (month ?? []).filter((o) => o.status !== "provider_failed");
  const spentThisMonth = placedThisMonth.reduce((sum, o) => sum + Number(o.customer_charge || 0), 0);

  const used = new Map<string, { id: string; name: string; link: string; times: number }>();
  for (const r of usedRows ?? []) {
    const hit = used.get(r.provider_service_id!);
    if (hit) hit.times += 1;
    else
      used.set(r.provider_service_id!, {
        id: r.provider_service_id!,
        name: r.service_name ?? `Service #${r.provider_service_id}`,
        link: r.target_url,
        times: 1,
      });
  }
  const favourites = [...used.values()].slice(0, 4);
  const isEmpty = !activeOrders.length && !recentOrders.length;

  return (
    <div className="space-y-10">
      <PageHeader title="Overview" />

      <section className="grid overflow-hidden rounded-lg border bg-card sm:grid-cols-[1.4fr_1fr_1fr]">
        <div className="p-5">
          <p className="text-[13px] text-muted-foreground">{cfg?.name ?? "Panel"} balance</p>
          {balance.ok ? (
            <p className="mt-1.5 text-3xl font-semibold tracking-[-0.03em] tabular-nums">
              {formatCurrency(balance.balance, balance.currency)}
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-destructive">
              Can&apos;t reach the panel.{" "}
              <Link href="/settings" className="font-medium underline underline-offset-2">
                Check settings
              </Link>
            </p>
          )}
          {cfg?.topUpUrl ? (
            <a
              href={cfg.topUpUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
            >
              Add funds on {cfg.name}
              <ArrowUpRight className="size-3.5" />
            </a>
          ) : null}
        </div>
        <Stat label="Running now" value={formatNumber(activeOrders.length)} />
        <Stat
          label="This month"
          value={formatCurrency(spentThisMonth, currency)}
          sub={`${formatNumber(placedThisMonth.length)} order${placedThisMonth.length === 1 ? "" : "s"}`}
        />
      </section>

      {isEmpty ? (
        <GettingStarted balanceZero={balance.ok && balance.balance <= 0} topUpUrl={cfg?.topUpUrl} />
      ) : null}

      {activeOrders.length ? (
        <section>
          <SectionTitle action={<OrderSync active />}>Running</SectionTitle>
          <OrdersList orders={activeOrders} />
        </section>
      ) : null}

      {favourites.length ? (
        <section>
          <SectionTitle>Order again</SectionTitle>
          <ul className="grid gap-3 sm:grid-cols-2">
            {favourites.map((f) => (
              <li key={f.id}>
                <ComposeButton
                  prefill={{ serviceId: f.id, link: f.link }}
                  className="group flex h-full w-full items-center gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:border-foreground/20"
                >
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm leading-snug font-medium">{f.name}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      <span className="font-mono">#{f.id}</span> · last used on {shortLink(f.link)}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </ComposeButton>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {recentOrders.length ? (
        <section>
          <SectionTitle
            action={
              <Link href="/orders?status=all" className="text-[13px] font-medium text-primary hover:underline">
                All orders
              </Link>
            }
          >
            Recently finished
          </SectionTitle>
          <OrdersList orders={recentOrders} />
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-t p-5 sm:border-t-0 sm:border-l">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tracking-[-0.02em] tabular-nums">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function GettingStarted({ balanceZero, topUpUrl }: { balanceZero: boolean; topUpUrl?: string }) {
  const steps = [
    {
      title: "Fund your panel",
      body: "Orders are paid from your balance on the panel, not inside this app.",
      action: topUpUrl ? (
        <a href={topUpUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          Add funds <ArrowUpRight className="size-3.5" />
        </a>
      ) : null,
      highlight: balanceZero,
    },
    {
      title: "Pick a service",
      body: "Or skip this: paste a link and the app suggests services for it.",
      action: (
        <Link href="/services" className="font-medium text-primary hover:underline">
          Browse services
        </Link>
      ),
      highlight: false,
    },
    {
      title: "Paste a link and send",
      body: "The order goes straight to the panel. Progress updates here automatically.",
      action: (
        <ComposeButton className="font-medium text-primary hover:underline">New order</ComposeButton>
      ),
      highlight: !balanceZero,
    },
  ];
  return (
    <section>
      <SectionTitle>Getting started</SectionTitle>
      <ol className="grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="bg-card p-5">
            <span
              className={
                s.highlight
                  ? "flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                  : "flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
              }
            >
              {i + 1}
            </span>
            <p className="mt-3 text-sm font-medium">{s.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            {s.action ? <p className="mt-3 text-[13px]">{s.action}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
