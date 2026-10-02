import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CircleAlert, RotateCcw } from "lucide-react";
import { requireOwner } from "@/lib/auth/owner";
import { getPanelConfig } from "@/lib/panel";
import { formatCurrency, formatNumber, timeAgo } from "@/lib/panel/shared";
import { ACTIVE_STATUSES } from "@/lib/services/sync-orders.service";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/orders/status-badge";
import { OrderProgress, deliveredOf } from "@/components/orders/order-progress";
import { OrderSync } from "@/components/orders/order-sync";
import { CancelButton, CopyButton, RefillButton } from "@/components/orders/order-actions";
import { ComposeButton } from "@/components/composer/composer-provider";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOwner();
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, services(name)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!order) notFound();

  const cfg = getPanelConfig();
  const name = order.service_name ?? (order.services as { name: string } | null)?.name ?? "Unknown service";
  const active = ACTIVE_STATUSES.includes(order.status);
  const failed = order.status === "failed" || order.status === "provider_failed";
  const delivered = deliveredOf(order);
  const canRefill =
    order.refill_supported && !!order.provider_order_id && (order.status === "completed" || order.status === "partial");
  const canCancel = order.cancel_supported && !!order.provider_order_id && active && !order.cancel_requested_at;
  const params_ = (order.order_params ?? {}) as { comments?: string; username?: string; answer_number?: string };
  const reorder = order.provider_service_id
    ? { serviceId: order.provider_service_id, link: order.target_url, quantity: order.quantity }
    : null;

  const placed = new Date(order.created_at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Orders
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusBadge status={order.status} />
          <span className="text-xs text-muted-foreground">
            Placed {placed}
            {order.provider_order_id ? (
              <>
                {" "}· Panel <span className="font-mono">#{order.provider_order_id}</span>
              </>
            ) : null}
          </span>
        </div>
        <h1 className="text-xl leading-snug font-semibold tracking-[-0.02em]">{name}</h1>
        {order.service_category ? (
          <p className="text-[13px] text-muted-foreground">
            {order.service_category}
            {order.provider_service_id ? (
              <>
                {" "}· service <span className="font-mono">#{order.provider_service_id}</span>
              </>
            ) : null}
          </p>
        ) : null}
      </header>

      {failed && order.error_message ? (
        <div className="flex gap-3 rounded-lg border border-destructive/25 bg-destructive/5 p-4">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="text-sm">
            <p className="font-medium text-destructive">
              {order.status === "provider_failed" ? "The panel didn't accept this order" : "The panel marked this order as failed"}
            </p>
            <p className="mt-1 leading-relaxed text-foreground/80">{order.error_message}</p>
          </div>
        </div>
      ) : null}

      <section className="rounded-lg border bg-card">
        <div className="p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[13px] text-muted-foreground">Delivered</p>
              <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] tabular-nums">
                {formatNumber(delivered)}
                <span className="text-base font-normal text-muted-foreground"> / {formatNumber(order.quantity)}</span>
              </p>
            </div>
            {active ? <OrderSync active /> : null}
          </div>
          <OrderProgress order={order} showLabel={false} className="mt-4" />
        </div>

        <dl className="grid grid-cols-2 border-t text-sm sm:grid-cols-4">
          <Fact label="Start count" value={order.start_count != null ? formatNumber(order.start_count) : "—"} />
          <Fact label="Remaining" value={order.remains != null && !failed ? formatNumber(order.remains) : "—"} />
          <Fact label={active ? "Cost so far" : "Cost"} value={formatCurrency(order.customer_charge, order.currency)} />
          <Fact label="Last checked" value={active || order.last_synced_at ? timeAgo(order.last_synced_at) : "—"} />
        </dl>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <p className="text-[13px] text-muted-foreground">Link</p>
        <div className="mt-1 flex items-center gap-1">
          <a
            href={/^https?:\/\//.test(order.target_url) ? order.target_url : undefined}
            target="_blank"
            rel="noreferrer"
            className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
            title={order.target_url}
          >
            {order.target_url}
          </a>
          <CopyButton value={order.target_url} label="Copy link" />
        </div>

        {params_.username ? <Extra label="Comment author" value={params_.username} /> : null}
        {params_.answer_number ? <Extra label="Poll answer" value={params_.answer_number} /> : null}
        {params_.comments ? (
          <div className="mt-4 border-t pt-4">
            <p className="text-[13px] text-muted-foreground">Comments ({params_.comments.split("\n").length})</p>
            <ol className="mt-2 max-h-64 list-decimal space-y-1 overflow-y-auto pl-5 text-sm marker:text-muted-foreground">
              {params_.comments.split("\n").map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ol>
          </div>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {reorder ? (
          <ComposeButton
            prefill={reorder}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RotateCcw className="size-3.5" />
            Order again
          </ComposeButton>
        ) : null}
        {canRefill ? <RefillButton orderId={order.id} requestedAt={order.refill_requested_at} /> : null}
        {canCancel ? <CancelButton orderId={order.id} /> : null}
        {order.cancel_requested_at && active ? (
          <span className="text-[13px] text-muted-foreground">Cancellation requested {timeAgo(order.cancel_requested_at)}</span>
        ) : null}
        {cfg?.host ? (
          <a
            href={`https://${cfg.host}/orders`}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
          >
            Open on {cfg.name}
            <ArrowUpRight className="size-3.5" />
          </a>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Internal reference <span className="font-mono">{order.order_number}</span>
      </p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b px-5 py-3.5 odd:border-r sm:border-b-0 sm:border-r sm:last:border-r-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function Extra({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 text-sm">
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
