"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import {
  platformLabel,
  fieldsForType,
  formatCurrency,
  formatNumber,
  type PanelService,
} from "@/lib/panel/shared";
import { cn } from "@/lib/utils";
import { ComposeButton } from "@/components/composer/composer-provider";

const PAGE = 60;

type Sort = "panel" | "cheapest";

export function ServicePicker({
  services,
  currency,
  recentIds = [],
  selectedId,
  onSelect,
  initialPlatform = "all",
  className,
}: {
  services: PanelService[];
  currency: string;
  recentIds?: string[];
  selectedId?: string | null;
  /** Select mode. Without it the picker renders "Order" links (browse mode). */
  onSelect?: (service: PanelService) => void;
  initialPlatform?: string;
  className?: string;
}) {
  const [platform, setPlatform] = useState(initialPlatform);
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("panel");
  const [limit, setLimit] = useState(PAGE);
  const q = useDeferredValue(query.trim().toLowerCase());

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of services) c[s.platform] = (c[s.platform] ?? 0) + 1;
    return c;
  }, [services]);

  const platforms = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => ({ key, label: platformLabel(key) }));

  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const s of services) {
      if (platform !== "all" && s.platform !== platform) continue;
      seen.set(s.category, (seen.get(s.category) ?? 0) + 1);
    }
    return [...seen.entries()];
  }, [services, platform]);

  const results = useMemo(() => {
    const terms = q.split(/\s+/).filter(Boolean);
    const list = services.filter((s) => {
      if (platform !== "all" && s.platform !== platform) return false;
      if (category && s.category !== category) return false;
      if (!terms.length) return true;
      if (terms.length === 1 && s.id === terms[0]) return true;
      const hay = `${s.id} ${s.name} ${s.category}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
    if (sort === "cheapest") list.sort((a, b) => Number(a.rate) - Number(b.rate));
    return list;
  }, [services, platform, category, q, sort]);

  const recent = useMemo(() => {
    if (q || category || !recentIds.length) return [];
    return recentIds
      .map((id) => services.find((s) => s.id === id))
      .filter((s): s is PanelService => !!s && (platform === "all" || s.platform === platform))
      .slice(0, 5);
  }, [recentIds, services, q, category, platform]);

  function pickPlatform(key: string) {
    setPlatform(key);
    setCategory("");
    setLimit(PAGE);
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="space-y-3 border-b p-4">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          <Chip active={platform === "all"} onClick={() => pickPlatform("all")}>
            All
          </Chip>
          {platforms.map((p) => (
            <Chip key={p.key} active={platform === p.key} onClick={() => pickPlatform(p.key)}>
              {p.label}
              <span className="ml-1 text-[11px] opacity-60 tabular-nums">{counts[p.key]}</span>
            </Chip>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search services</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
              placeholder="Search by name or service ID"
              className="h-9 w-full rounded-md border border-input bg-background pr-8 pl-9 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setLimit(PAGE);
            }}
            aria-label="Category"
            className="h-9 rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15 sm:max-w-[260px]"
          >
            <option value="">All categories ({categories.length})</option>
            {categories.map(([name, n]) => (
              <option key={name} value={name}>
                {name} ({n})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">
            {formatNumber(results.length)} service{results.length === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Sort">
            {(
              [
                ["panel", "Panel order"],
                ["cheapest", "Cheapest"],
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        {recent.length ? (
          <div className="border-b">
            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Used recently
            </p>
            <ul>
              {recent.map((s) => (
                <Row key={`r-${s.id}`} s={s} currency={currency} selectedId={selectedId} onSelect={onSelect} />
              ))}
            </ul>
          </div>
        ) : null}

        {results.length ? (
          <ul className="divide-y">
            {results.slice(0, limit).map((s) => (
              <Row key={s.id} s={s} currency={currency} selectedId={selectedId} onSelect={onSelect} />
            ))}
          </ul>
        ) : (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            No services match{query ? ` "${query}"` : ""}.
            {platform !== "all" || category ? (
              <button
                type="button"
                className="ml-1 font-medium text-primary hover:underline"
                onClick={() => {
                  pickPlatform("all");
                }}
              >
                Search all platforms
              </button>
            ) : null}
          </div>
        )}

        {results.length > limit ? (
          <div className="border-t p-3 text-center">
            <button
              type="button"
              onClick={() => setLimit((l) => l + PAGE)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Show more ({formatNumber(results.length - limit)} left)
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 shrink-0 items-center rounded-full border px-3 text-[13px] transition-colors",
        active
          ? "border-foreground bg-foreground font-medium text-background"
          : "bg-card text-foreground/80 hover:border-foreground/30 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function Row({
  s,
  currency,
  selectedId,
  onSelect,
}: {
  s: PanelService;
  currency: string;
  selectedId?: string | null;
  onSelect?: (s: PanelService) => void;
}) {
  const selected = s.id === selectedId;
  const supported = fieldsForType(s.type) !== null;
  const isPackage = s.type.toLowerCase() === "package";

  const body = (
    <>
      <div className="min-w-0 flex-1">
        <p className={cn("line-clamp-2 text-sm leading-snug", selected && "font-medium")}>{s.name}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="font-mono">#{s.id}</span>
          <span className="tabular-nums">
            {formatNumber(s.min)}–{formatNumber(s.max)}
          </span>
          {s.type !== "Default" ? <Tag>{s.type}</Tag> : null}
          {s.refill ? <Tag>Refill</Tag> : null}
          {s.cancel ? <Tag>Cancel</Tag> : null}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-medium tabular-nums">{formatCurrency(s.rate, currency)}</p>
        <p className="text-[11px] text-muted-foreground">{isPackage ? "per order" : "per 1,000"}</p>
      </div>
    </>
  );

  if (!onSelect) {
    return (
      <li className="flex items-start gap-4 px-4 py-3">
        {body}
        {supported ? (
          <ComposeButton
            prefill={{ serviceId: s.id }}
            className="mt-0.5 inline-flex h-7 shrink-0 items-center rounded-md border bg-card px-2.5 text-xs font-medium hover:bg-muted"
          >
            Order
          </ComposeButton>
        ) : (
          <span className="mt-1 shrink-0 text-[11px] text-muted-foreground" title="Order this on the panel">
            Panel only
          </span>
        )}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        disabled={!supported}
        onClick={() => onSelect(s)}
        aria-pressed={selected}
        title={supported ? undefined : `${s.type} services must be ordered on the panel`}
        className={cn(
          "relative flex w-full items-start gap-4 px-4 py-3 text-left transition-colors",
          selected ? "bg-accent" : "hover:bg-muted/50",
          !supported && "cursor-not-allowed opacity-50"
        )}
      >
        {selected ? (
          <span className="absolute inset-y-0 left-0 w-0.5 bg-primary" aria-hidden />
        ) : null}
        {body}
        <span
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-input"
          )}
          aria-hidden
        >
          {selected ? <Check className="size-3" strokeWidth={3} /> : null}
        </span>
      </button>
    </li>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border px-1 py-px text-[10.5px] leading-none font-medium text-foreground/70">
      {children}
    </span>
  );
}
