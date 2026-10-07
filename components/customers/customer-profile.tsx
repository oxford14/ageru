"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Loader2, MoreHorizontal, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteCustomerAction,
  updateCustomerAction,
  type CustomerDetail,
} from "@/app/actions/customers";
import { readLink } from "@/lib/panel/compose";
import { formatCurrency, formatNumber, shortLink, timeAgo } from "@/lib/panel/shared";
import { ComposeButton } from "@/components/composer/composer-provider";
import { PlatformGlyph } from "@/components/composer/platform-glyph";
import { StatusBadge } from "@/components/orders/status-badge";
import { OrderProgress } from "@/components/orders/order-progress";
import { CustomerAvatar } from "@/components/customers/customer-book";
import { cn } from "@/lib/utils";

const ORDERS_PREVIEW = 8;

export function CustomerProfile({ customer }: { customer: CustomerDetail }) {
  const router = useRouter();
  const [name, setName] = useState(customer.name);
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [editingName, setEditingName] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();

  const forCustomer = { customerId: customer.id, customerName: customer.name };
  const since = new Date(customer.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  function save(next: { name?: string; notes?: string }) {
    const nextName = (next.name ?? name).trim();
    const nextNotes = next.notes ?? notes;
    if (!nextName) {
      setName(customer.name);
      return;
    }
    if (nextName === customer.name && nextNotes === (customer.notes ?? "")) return;
    startSave(async () => {
      const res = await updateCustomerAction({ id: customer.id, name: nextName, notes: nextNotes });
      if (!res.ok) {
        toast.error(res.error);
        setName(customer.name);
        setNotes(customer.notes ?? "");
        return;
      }
      toast.success("Saved");
      router.refresh();
    });
  }

  function remove() {
    startDelete(async () => {
      const res = await deleteCustomerAction(customer.id);
      if (!res.ok) {
        toast.error(res.error);
        setConfirmDelete(false);
        return;
      }
      toast.success(`${customer.name} deleted`);
      router.push("/customers");
      router.refresh();
    });
  }

  const orders = showAllOrders ? customer.orders : customer.orders.slice(0, ORDERS_PREVIEW);

  return (
    <div className="space-y-5">
      <Link
        href="/customers"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground lg:hidden"
      >
        <ArrowLeft className="size-3.5" />
        All customers
      </Link>

      {/* ---- Identity ---- */}
      <section className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-start gap-4 p-5">
          <CustomerAvatar name={name || customer.name} size="lg" />
          <div className="min-w-0 flex-1">
            {editingName ? (
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  setEditingName(false);
                  save({ name });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") {
                    setName(customer.name);
                    setEditingName(false);
                  }
                }}
                aria-label="Customer name"
                className="-ml-1.5 w-full rounded-md border border-primary bg-background px-1.5 text-xl font-semibold tracking-[-0.02em] outline-none ring-3 ring-primary/15"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="group -ml-1.5 flex max-w-full items-center gap-2 rounded-md px-1.5 text-left hover:bg-muted"
                title="Rename"
              >
                <h2 className="truncate text-xl font-semibold tracking-[-0.02em]">{name}</h2>
                <Pencil className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            )}
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              Customer since {since}
              {saving ? <Loader2 className="size-3 animate-spin" /> : null}
            </p>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <ComposeButton
              prefill={forCustomer}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 sm:flex-none"
            >
              <Plus className="size-4" />
              New order
            </ComposeButton>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen((v) => !v);
                  setConfirmDelete(false);
                }}
                aria-label="More actions"
                aria-expanded={menuOpen}
                className="flex size-9 items-center justify-center rounded-lg border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <MoreHorizontal className="size-4" />
              </button>
              {menuOpen ? (
                <div className="absolute top-11 right-0 z-20 w-60 rounded-xl border bg-popover p-1.5 shadow-lg">
                  {confirmDelete ? (
                    <div className="p-2">
                      <p className="text-[13px] font-medium">Delete {customer.name}?</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {customer.orderCount
                          ? "Customers with orders are kept for history and can't be deleted."
                          : "This can't be undone."}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={remove}
                          disabled={deleting || customer.orderCount > 0}
                          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-destructive text-[13px] font-medium text-white hover:bg-destructive/90 disabled:opacity-50"
                        >
                          {deleting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setMenuOpen(false)}
                          className="h-8 flex-1 rounded-lg border text-[13px] font-medium hover:bg-muted"
                        >
                          Keep
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <MenuItem
                        icon={Pencil}
                        onClick={() => {
                          setMenuOpen(false);
                          setEditingName(true);
                        }}
                      >
                        Rename
                      </MenuItem>
                      <MenuItem icon={Trash2} destructive onClick={() => setConfirmDelete(true)}>
                        Delete customer
                      </MenuItem>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* notes */}
        <div className="border-t px-5 py-3.5">
          {editingNotes ? (
            <textarea
              autoFocus
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                setEditingNotes(false);
                save({ notes });
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setNotes(customer.notes ?? "");
                  setEditingNotes(false);
                }
              }}
              rows={3}
              placeholder="Handle, package, budget, anything you'll want to remember"
              className="w-full resize-y rounded-lg border border-primary bg-background px-3 py-2 text-sm leading-relaxed outline-none ring-3 ring-primary/15"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingNotes(true)}
              className={cn(
                "-mx-2 block w-[calc(100%+1rem)] rounded-md px-2 py-1 text-left text-sm leading-relaxed whitespace-pre-line hover:bg-muted",
                notes ? "text-foreground/85" : "text-muted-foreground"
              )}
            >
              {notes || "+ Add a note: handle, package, budget…"}
            </button>
          )}
        </div>

        <dl className="grid grid-cols-2 border-t sm:grid-cols-4">
          <Fact label="Orders" value={formatNumber(customer.orderCount)} />
          <Fact label="Spent" value={formatCurrency(customer.spent, customer.currency)} />
          <Fact
            label="Running now"
            value={formatNumber(customer.activeCount)}
            highlight={customer.activeCount > 0}
          />
          <Fact label="Links" value={formatNumber(customer.links.length)} />
        </dl>
      </section>

      {/* ---- Links ---- */}
      <section>
        <SectionLabel>Links</SectionLabel>
        {customer.links.length ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {customer.links.map((l) => {
              const insight = readLink(l.targetUrl);
              const external = /^https?:\/\//i.test(l.targetUrl);
              return (
                <li key={l.targetUrl} className="flex flex-col rounded-xl border bg-card p-4">
                  <div className="flex items-start gap-2.5">
                    <PlatformGlyph platform={insight?.platform} className="size-7" />
                    <div className="min-w-0 flex-1">
                      {external ? (
                        <a
                          href={l.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-1 text-sm font-medium"
                          title={l.targetUrl}
                        >
                          <span className="truncate group-hover:underline">{shortLink(l.targetUrl)}</span>
                          <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
                        </a>
                      ) : (
                        <p className="truncate text-sm font-medium">{l.targetUrl}</p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                        {l.orderCount} boost{l.orderCount === 1 ? "" : "s"} · {formatCurrency(l.spent, customer.currency)} ·{" "}
                        {timeAgo(l.lastBoostedAt)}
                      </p>
                    </div>
                  </div>
                  {l.lastServiceName ? (
                    <p className="mt-3 line-clamp-2 text-xs leading-snug text-muted-foreground">
                      Last: <span className="text-foreground/80">{l.lastServiceName}</span>
                    </p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    {l.lastStatus ? <StatusBadge status={l.lastStatus} className="text-xs" /> : <span />}
                    <ComposeButton
                      prefill={{
                        ...forCustomer,
                        link: l.targetUrl,
                        serviceId: l.lastServiceId ?? undefined,
                        quantity: l.lastQuantity,
                      }}
                      className="inline-flex h-7 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs font-medium transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <RotateCcw className="size-3" />
                      Boost again
                    </ComposeButton>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed bg-card px-6 py-10 text-center">
            <p className="text-sm font-medium">No links boosted yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Start the first order for {customer.name}.</p>
            <ComposeButton
              prefill={forCustomer}
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-4" />
              New order for {customer.name}
            </ComposeButton>
          </div>
        )}
      </section>

      {/* ---- Orders ---- */}
      {customer.orders.length ? (
        <section>
          <SectionLabel>Orders</SectionLabel>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_140px_auto]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{o.serviceName ?? "Order"}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {shortLink(o.link)} · {timeAgo(o.createdAt)}
                    </span>
                  </span>
                  <OrderProgress order={o} className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto" />
                  <span className="flex flex-col items-end gap-1 sm:row-start-auto">
                    <StatusBadge status={o.status} className="text-xs" />
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatCurrency(o.charge, o.currency)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {customer.orders.length > ORDERS_PREVIEW ? (
            <button
              type="button"
              onClick={() => setShowAllOrders((v) => !v)}
              className="mt-2 text-[13px] font-medium text-primary hover:underline"
            >
              {showAllOrders ? "Show fewer" : `Show all ${customer.orders.length} orders`}
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">{children}</h3>
  );
}

function Fact({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="border-b px-5 py-3.5 odd:border-r sm:border-b-0 sm:border-r sm:last:border-r-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 text-base font-semibold tabular-nums", highlight && "text-primary")}>{value}</dd>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  destructive,
  onClick,
  children,
}: {
  icon: typeof Pencil;
  destructive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-muted",
        destructive && "text-destructive"
      )}
    >
      <Icon className="size-3.5" />
      {children}
    </button>
  );
}
