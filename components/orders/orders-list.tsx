import Link from "next/link";
import type { OrderRow } from "@/lib/supabase/database.types";
import { formatCurrency, shortLink, timeAgo } from "@/lib/panel/shared";
import { StatusBadge } from "@/components/orders/status-badge";
import { OrderProgress } from "@/components/orders/order-progress";
import { cn } from "@/lib/utils";

export type OrderListItem = Pick<
  OrderRow,
  | "id"
  | "order_number"
  | "provider_order_id"
  | "service_name"
  | "target_url"
  | "quantity"
  | "remains"
  | "status"
  | "customer_charge"
  | "currency"
  | "created_at"
  | "error_message"
  | "combo_group_id"
  | "combo_plan_id"
> & {
  services?: { name: string } | null;
  combo_plan?: { name: string } | null;
};

export const ORDER_LIST_COLUMNS =
  "id, order_number, provider_order_id, service_name, target_url, quantity, remains, status, customer_charge, currency, created_at, error_message, combo_group_id, combo_plan_id, services(name), combo_plan:combo_plans(name)";

const grid = "md:grid md:grid-cols-[minmax(0,1fr)_150px_96px_110px_84px] md:items-center md:gap-6";

export function OrdersList({
  orders,
  className,
}: {
  orders: OrderListItem[];
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card", className)}>
      <div
        className={cn(
          grid,
          "hidden border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground"
        )}
      >
        <span>Service</span>
        <span>Delivered</span>
        <span className="text-right">Cost</span>
        <span>Status</span>
        <span className="text-right">Placed</span>
      </div>
      <ul className="divide-y">
        {orders.map((o) => {
          const name = o.service_name ?? o.services?.name ?? "Unknown service";
          return (
            <li key={o.id}>
              <Link
                href={`/orders/${o.id}`}
                className={cn(grid, "block px-4 py-3.5 transition-colors hover:bg-muted/40")}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" title={name}>
                    {o.combo_group_id ? (
                      <span className="mr-1.5 inline-flex rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Combo
                        {o.combo_plan?.name ? ` · ${o.combo_plan.name}` : ""}
                      </span>
                    ) : null}
                    {name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    <span className="font-mono">#{o.provider_order_id ?? o.order_number}</span>
                    <span className="mx-1.5 text-border">/</span>
                    {shortLink(o.target_url)}
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-4 md:contents">
                  <OrderProgress order={o} className="flex-1 md:flex-none" />
                  <p className="text-sm tabular-nums md:text-right">
                    {formatCurrency(o.customer_charge, o.currency)}
                  </p>
                </div>

                <div className="mt-2 flex items-center justify-between md:contents">
                  <StatusBadge status={o.status} />
                  <p className="text-xs text-muted-foreground md:text-right">{timeAgo(o.created_at)}</p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
