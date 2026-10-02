"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, History, Loader2, RotateCcw, ShieldCheck, Star } from "lucide-react";
import { toast } from "sonner";
import { refillOrderAction } from "@/app/actions/orders";
import type { ComposerHistoryItem } from "@/app/actions/composer";
import { readLink } from "@/lib/panel/compose";
import { formatCurrency, formatNumber, shortLink, timeAgo, type PanelService } from "@/lib/panel/shared";
import { StatusBadge } from "@/components/orders/status-badge";
import { OrderProgress } from "@/components/orders/order-progress";
import { PlatformGlyph } from "@/components/composer/platform-glyph";
import { cn } from "@/lib/utils";

const DAY = 24 * 60 * 60 * 1000;

/** Same target regardless of https/www/trailing slash/tracking params. */
export function linkKey(link: string) {
  try {
    const u = new URL(/^https?:\/\//i.test(link) ? link : `https://${link}`);
    const host = u.hostname.toLowerCase().replace(/^(www|m|mobile|web)\./, "");
    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    const v = u.searchParams.get("v");
    return `${host}${path}${v ? `?v=${v}` : ""}`;
  } catch {
    return link.trim().toLowerCase().replace(/^@/, "");
  }
}

export function canRefill(o: ComposerHistoryItem, now = Date.now()) {
  if (!o.refillSupported || !o.providerOrderId) return false;
  if (o.status !== "completed" && o.status !== "partial") return false;
  if (now - new Date(o.createdAt).getTime() > 90 * DAY) return false;
  if (o.refillRequestedAt && now - new Date(o.refillRequestedAt).getTime() < DAY) return false;
  return true;
}

export function RefillButton({ order, compact }: { order: ComposerHistoryItem; compact?: boolean }) {
  const [state, setState] = useState<"idle" | "done">("idle");
  const [pending, start] = useTransition();
  if (state === "done") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <Check className="size-3.5" /> Requested
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await refillOrderAction(order.id);
          if (res.ok) {
            setState("done");
            toast.success("Refill requested");
          } else toast.error(res.error);
        })
      }
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-card font-medium transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-60",
        compact ? "h-7 px-2 text-xs" : "h-8 px-2.5 text-[13px]"
      )}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
      Refill
    </button>
  );
}

function PanelTitle({ icon: Icon, children }: { icon: typeof History; children: React.ReactNode }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
      <Icon className="size-3.5" />
      {children}
    </p>
  );
}

/** Shown before a link is pasted: jump back to a recent target, or top up drops. */
export function StartPanels({
  history,
  favorites,
  currency,
  onUseLink,
  onPickService,
  onNavigate,
}: {
  history: ComposerHistoryItem[];
  favorites: PanelService[];
  currency: string;
  onUseLink: (link: string) => void;
  onPickService: (service: PanelService) => void;
  onNavigate: () => void;
}) {
  const seen = new Set<string>();
  const recent: ComposerHistoryItem[] = [];
  for (const o of history) {
    const k = linkKey(o.link);
    if (seen.has(k)) continue;
    seen.add(k);
    recent.push(o);
    if (recent.length === 6) break;
  }
  const refills = history.filter((o) => canRefill(o)).slice(0, 4);

  const favoritesBlock = favorites.length ? (
    <div className="mt-6">
      <PanelTitle icon={Star}>Favourites</PanelTitle>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {favorites.slice(0, 6).map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => onPickService(f)}
              title={f.name}
              className="group flex w-full items-center gap-2.5 rounded-lg border bg-card px-2.5 py-2 text-left transition-colors hover:border-primary/40"
            >
              <PlatformGlyph platform={f.platform} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">{f.name}</span>
                <span className="block text-xs text-muted-foreground tabular-nums">
                  <span className="font-mono">#{f.id}</span> · {formatCurrency(f.rate, currency)}
                  {f.type.toLowerCase() === "package" ? " per order" : " / 1k"}
                </span>
              </span>
              <Star className="size-3.5 shrink-0 fill-current text-warning" />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">Pick one, then paste the link above.</p>
    </div>
  ) : null;

  if (!recent.length && !refills.length) {
    return (
      favoritesBlock ?? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Your recent links, favourites and refill offers will show up here. Tap ☆ on any service to save it.
        </p>
      )
    );
  }

  return (
    <>
      {favoritesBlock}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {recent.length ? (
          <div>
            <PanelTitle icon={History}>Recent links</PanelTitle>
            <ul className="space-y-1">
              {recent.map((o) => {
                const insight = readLink(o.link);
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => onUseLink(o.link)}
                      className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                    >
                      <PlatformGlyph platform={insight?.platform} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{shortLink(o.link)}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {o.serviceName ?? "Order"} · {timeAgo(o.createdAt)}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        Use
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {refills.length ? (
          <div>
            <PanelTitle icon={ShieldCheck}>Refill available</PanelTitle>
            <ul className="space-y-2">
              {refills.map((o) => (
                <li key={o.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/orders/${o.id}`}
                      onClick={onNavigate}
                      className="block truncate text-[13px] font-medium hover:underline"
                    >
                      {o.serviceName ?? "Order"}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatNumber(o.quantity)} · {shortLink(o.link)} · {timeAgo(o.createdAt)}
                    </p>
                  </div>
                  <RefillButton order={o} compact />
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              Dropped since delivery? A refill tops it back up for free.
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}

/** Shown once a link is pasted that has been boosted before. */
export function LinkHistory({
  orders,
  onRepeat,
  onNavigate,
}: {
  orders: ComposerHistoryItem[];
  onRepeat: (o: ComposerHistoryItem) => void;
  onNavigate: () => void;
}) {
  if (!orders.length) return null;
  return (
    <div className="mt-4 rounded-xl border bg-muted/30 p-3">
      <PanelTitle icon={History}>
        Boosted {orders.length === 1 ? "once" : `${orders.length} times`} before
      </PanelTitle>
      <ul className="divide-y">
        {orders.slice(0, 4).map((o) => (
          <li key={o.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <StatusBadge status={o.status} className="text-xs" />
                <span className="text-xs text-muted-foreground">{timeAgo(o.createdAt)}</span>
              </div>
              <Link
                href={`/orders/${o.id}`}
                onClick={onNavigate}
                className="mt-0.5 block truncate text-[13px] font-medium hover:underline"
              >
                {o.serviceName ?? "Order"}
              </Link>
              <OrderProgress order={o} className="mt-1.5 max-w-[220px]" />
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {canRefill(o) ? <RefillButton order={o} compact /> : null}
              {o.serviceId ? (
                <button
                  type="button"
                  onClick={() => onRepeat(o)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Same again
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
