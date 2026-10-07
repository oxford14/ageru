"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Loader2, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import {
  createCustomerAction,
  type CustomerDetail,
  type CustomerListItem,
} from "@/app/actions/customers";
import { formatCurrency, formatNumber, timeAgo } from "@/lib/panel/shared";
import { CustomerProfile } from "@/components/customers/customer-profile";
import { cn } from "@/lib/utils";

type Sort = "recent" | "name" | "orders";

export function CustomerBook({
  customers,
  selectedId,
  detail,
  detailError,
}: {
  customers: CustomerListItem[];
  selectedId: string | null;
  detail: CustomerDetail | null;
  detailError: string | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [navigating, startNav] = useTransition();
  const [creating, startCreate] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const q = query.trim();
  const visible = useMemo(() => {
    const needle = q.toLowerCase();
    const list = customers.filter(
      (c) => !needle || c.name.toLowerCase().includes(needle) || (c.notes ?? "").toLowerCase().includes(needle)
    );
    return list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "orders") return b.orderCount - a.orderCount || a.name.localeCompare(b.name);
      // Recent: running first, then latest order, then newest customer.
      return (
        b.activeCount - a.activeCount ||
        (b.lastOrderAt ?? b.created_at).localeCompare(a.lastOrderAt ?? a.created_at)
      );
    });
  }, [customers, q, sort]);

  const exactMatch = customers.some((c) => c.name.toLowerCase() === q.toLowerCase());
  const canQuickAdd = q.length > 0 && !exactMatch;

  function open(id: string) {
    setPendingId(id);
    startNav(() => router.push(`/customers?c=${id}`, { scroll: false }));
  }

  function quickAdd() {
    if (!canQuickAdd) return;
    startCreate(async () => {
      const res = await createCustomerAction({ name: q });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.data.name} added`);
      setQuery("");
      open(res.data.id);
    });
  }

  const showingId = navigating ? pendingId : selectedId;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
      {/* ---- List ---- */}
      <aside
        className={cn(
          "overflow-hidden rounded-xl border bg-card lg:sticky lg:top-6",
          selectedId && "hidden lg:block"
        )}
      >
        <div className="space-y-3 border-b p-3">
          <label className="relative block">
            <span className="sr-only">Search or add a customer</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (canQuickAdd) quickAdd();
                  else if (visible[0]) open(visible[0].id);
                }
              }}
              placeholder="Search or add a customer"
              className="h-10 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm outline-none placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15"
            />
          </label>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="tabular-nums">
              {formatNumber(customers.length)} customer{customers.length === 1 ? "" : "s"}
            </span>
            <div className="flex gap-0.5" role="radiogroup" aria-label="Sort customers">
              {(
                [
                  ["recent", "Recent"],
                  ["name", "A–Z"],
                  ["orders", "Most orders"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={sort === key}
                  onClick={() => setSort(key)}
                  className={cn(
                    "rounded px-2 py-1 transition-colors",
                    sort === key ? "bg-muted font-medium text-foreground" : "hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <ul className="max-h-[60vh] overflow-y-auto lg:max-h-[calc(100vh-15rem)]">
          {canQuickAdd ? (
            <li className="border-b">
              <button
                type="button"
                onClick={quickAdd}
                disabled={creating}
                className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-accent/50"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-primary/50 text-primary">
                  {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    Add <span className="text-primary">“{q}”</span>
                  </span>
                  <span className="block text-xs text-muted-foreground">New customer</span>
                </span>
                <kbd className="hidden items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-flex">
                  <CornerDownLeft className="size-3" /> Enter
                </kbd>
              </button>
            </li>
          ) : null}

          {visible.map((c) => {
            const active = c.id === showingId;
            return (
              <li key={c.id}>
                <Link
                  href={`/customers?c=${c.id}`}
                  scroll={false}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                    e.preventDefault();
                    open(c.id);
                  }}
                  aria-current={c.id === selectedId ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 px-3 py-3 transition-colors",
                    active ? "bg-accent" : "hover:bg-muted/50"
                  )}
                >
                  {active ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" aria-hidden /> : null}
                  <CustomerAvatar name={c.name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{c.name}</span>
                      {c.activeCount ? (
                        <span className="relative flex size-2 shrink-0" title={`${c.activeCount} running`}>
                          <span className="absolute inset-0 animate-ping rounded-full bg-primary/50" />
                          <span className="relative size-2 rounded-full bg-primary" />
                        </span>
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground tabular-nums">
                      {c.orderCount
                        ? `${formatNumber(c.orderCount)} order${c.orderCount === 1 ? "" : "s"} · ${formatCurrency(c.spent, c.currency)}`
                        : "No orders yet"}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {navigating && pendingId === c.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : c.lastOrderAt ? (
                      timeAgo(c.lastOrderAt)
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}

          {!visible.length && !canQuickAdd ? (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">
              Type a name above to add your first customer.
            </li>
          ) : null}
        </ul>
      </aside>

      {/* ---- Detail ---- */}
      <section className={cn(!selectedId && "hidden lg:block", navigating && "opacity-60 transition-opacity")}>
        {selectedId && detail ? (
          <CustomerProfile key={detail.id} customer={detail} />
        ) : selectedId && detailError ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <p className="text-sm font-medium">{detailError}</p>
            <Link href="/customers" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Back to all customers
            </Link>
          </div>
        ) : (
          <BookOverview customers={customers} onOpen={open} />
        )}
      </section>
    </div>
  );
}

/** Shown on desktop before a customer is picked. */
function BookOverview({
  customers,
  onOpen,
}: {
  customers: CustomerListItem[];
  onOpen: (id: string) => void;
}) {
  const top = [...customers].filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent).slice(0, 5);
  const running = customers.reduce((n, c) => n + c.activeCount, 0);
  const spent = customers.reduce((n, c) => n + c.spent, 0);
  const currency = customers.find((c) => c.orderCount)?.currency ?? "USD";
  const maxSpent = top[0]?.spent ?? 0;

  return (
    <div className="rounded-xl border bg-card">
      <div className="grid grid-cols-3 divide-x border-b">
        <Stat label="Customers" value={formatNumber(customers.length)} />
        <Stat label="Running now" value={formatNumber(running)} />
        <Stat label="Total spent" value={formatCurrency(spent, currency)} />
      </div>

      {top.length ? (
        <div className="p-5">
          <p className="mb-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Top customers</p>
          <ul className="space-y-1">
            {top.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onOpen(c.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
                >
                  <CustomerAvatar name={c.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium">{c.name}</span>
                      <span className="shrink-0 text-sm tabular-nums">{formatCurrency(c.spent, c.currency)}</span>
                    </span>
                    <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-primary/70"
                        style={{ width: `${maxSpent ? Math.max(4, (c.spent / maxSpent) * 100) : 0}%` }}
                      />
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-col items-center px-6 py-12 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Users className="size-5" />
        </span>
        <p className="mt-3 text-sm font-medium">Pick a customer</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Their links, orders and spend show up here. To add someone, type their name in the search box and press Enter.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-[-0.02em] tabular-nums">{value}</p>
    </div>
  );
}

export function CustomerAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials =
    name
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?";
  let hue = 0;
  for (const ch of name.toLowerCase()) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        size === "sm" && "size-7 text-[11px]",
        size === "md" && "size-9 text-xs",
        size === "lg" && "size-14 text-lg"
      )}
      style={{ background: `oklch(0.93 0.045 ${hue})`, color: `oklch(0.42 0.13 ${hue})` }}
    >
      {initials}
    </span>
  );
}
