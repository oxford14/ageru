import type { OrderStatus } from "@/lib/supabase/database.types";
import { formatNumber } from "@/lib/panel/shared";
import { cn } from "@/lib/utils";

export function deliveredOf(order: {
  quantity: number;
  remains: number | null;
  status: OrderStatus;
}) {
  if (order.status === "completed") return order.quantity;
  if (order.status === "pending" || order.status === "provider_failed") return 0;
  if (order.remains == null) return 0;
  return Math.max(0, Math.min(order.quantity, order.quantity - order.remains));
}

export function OrderProgress({
  order,
  className,
  showLabel = true,
}: {
  order: { quantity: number; remains: number | null; status: OrderStatus };
  className?: string;
  showLabel?: boolean;
}) {
  const delivered = deliveredOf(order);
  const pct = order.quantity > 0 ? Math.round((delivered / order.quantity) * 100) : 0;
  const failed = order.status === "failed" || order.status === "provider_failed";
  const muted = order.status === "canceled" || order.status === "refunded";

  return (
    <div className={cn("min-w-0", className)}>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={order.quantity}
        aria-valuenow={delivered}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            failed ? "bg-destructive/60" : muted ? "bg-muted-foreground/40" : order.status === "completed" ? "bg-success" : "bg-primary"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel ? (
        <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
          {formatNumber(delivered)} / {formatNumber(order.quantity)}
        </p>
      ) : null}
    </div>
  );
}
