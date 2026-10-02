import Link from "next/link";
import { Search } from "lucide-react";
import { requireOwner } from "@/lib/auth/owner";
import { ACTIVE_STATUSES } from "@/lib/services/sync-orders.service";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/supabase/database.types";
import { PageHeader } from "@/components/app/page-header";
import { OrdersList, ORDER_LIST_COLUMNS, type OrderListItem } from "@/components/orders/orders-list";
import { OrderSync } from "@/components/orders/order-sync";
import { ComposeButton } from "@/components/composer/composer-provider";
import { cn } from "@/lib/utils";

const TABS = {
  active: { label: "Running", statuses: ACTIVE_STATUSES },
  done: { label: "Finished", statuses: ["completed", "partial", "canceled", "refunded"] as OrderStatus[] },
  problems: { label: "Problems", statuses: ["failed", "provider_failed"] as OrderStatus[] },
  all: { label: "All", statuses: null },
} as const;
type TabKey = keyof typeof TABS;

const PAGE_SIZE = 50;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string; combo?: string }>;
}) {
  const user = await requireOwner();
  const params = await searchParams;
  const supabase = await createClient();
  const q = params.q?.trim() ?? "";
  const comboFilter = params.combo?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const counts = Object.fromEntries(
    await Promise.all(
      (Object.keys(TABS) as TabKey[]).map(async (key) => {
        let query = supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        const statuses = TABS[key].statuses;
        if (statuses) query = query.in("status", statuses);
        const { count } = await query;
        return [key, count ?? 0] as const;
      })
    )
  ) as Record<TabKey, number>;

  const requested = params.status as TabKey | undefined;
  const tab: TabKey =
    requested && requested in TABS ? requested : counts.active > 0 ? "active" : "all";

  let query = supabase
    .from("orders")
    .select(ORDER_LIST_COLUMNS, { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const statuses = TABS[tab].statuses;
  if (statuses) query = query.in("status", statuses);
  if (q) {
    const safe = q.replace(/[%,()]/g, " ");
    query = query.or(
      `order_number.ilike.%${safe}%,provider_order_id.ilike.%${safe}%,target_url.ilike.%${safe}%,service_name.ilike.%${safe}%`
    );
  }
  if (comboFilter) {
    query = query.eq("combo_group_id", comboFilter);
  }
  const { data, count } = await query;
  const orders = (data ?? []) as unknown as OrderListItem[];
  const total = count ?? 0;

  const href = (next: Partial<{ status: string; q: string; page: number }>) => {
    const sp = new URLSearchParams();
    const status = next.status ?? tab;
    sp.set("status", status);
    const nq = next.q ?? q;
    if (nq) sp.set("q", nq);
    if (next.page && next.page > 1) sp.set("page", String(next.page));
    return `/orders?${sp.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        actions={<OrderSync active={counts.active > 0} />}
      />

      {comboFilter ? (
        <p className="text-sm text-muted-foreground">
          Showing combo group{" "}
          <span className="font-mono text-foreground">{comboFilter.slice(0, 8)}…</span>{" "}
          <Link href="/orders" className="text-primary hover:underline">
            Clear filter
          </Link>
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="-mb-px flex gap-1 overflow-x-auto border-b sm:border-b-0" aria-label="Filter orders">
          {(Object.keys(TABS) as TabKey[]).map((key) => (
            <Link
              key={key}
              href={href({ status: key, page: 1 })}
              aria-current={tab === key ? "page" : undefined}
              className={cn(
                "flex h-9 items-center gap-1.5 border-b-2 px-3 text-sm whitespace-nowrap transition-colors sm:rounded-md sm:border-b-0",
                tab === key
                  ? "border-primary font-medium text-foreground sm:bg-card sm:shadow-[0_0_0_1px_var(--border)]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {TABS[key].label}
              <span
                className={cn(
                  "text-xs tabular-nums",
                  key === "problems" && counts.problems > 0 ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {counts[key]}
              </span>
            </Link>
          ))}
        </nav>

        <form action="/orders" className="relative sm:w-72">
          <input type="hidden" name="status" value={tab} />
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search service, link or order #"
            className="h-9 w-full rounded-md border border-input bg-card pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15"
          />
        </form>
      </div>

      {orders.length ? (
        <OrdersList orders={orders} />
      ) : (
        <div className="rounded-lg border border-dashed bg-card px-6 py-16 text-center">
          <p className="text-sm font-medium">
            {q ? `No orders match "${q}"` : tab === "active" ? "Nothing running" : "No orders here yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {q ? (
              <Link href={href({ q: "", page: 1 })} className="text-primary hover:underline">
                Clear search
              </Link>
            ) : (
              <>
                Start one from{" "}
                <ComposeButton className="text-primary hover:underline">New order</ComposeButton>
                .
              </>
            )}
          </p>
        </div>
      )}

      {total > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground tabular-nums">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={href({ page: page - 1 })} className="rounded-md border bg-card px-3 py-1.5 hover:bg-muted">
                Newer
              </Link>
            ) : null}
            {page * PAGE_SIZE < total ? (
              <Link href={href({ page: page + 1 })} className="rounded-md border bg-card px-3 py-1.5 hover:bg-muted">
                Older
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
