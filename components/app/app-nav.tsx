"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, ListOrdered, Plus, Search, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useComposer } from "@/components/composer/composer-provider";

const items = [
  { href: "/dashboard", label: "Overview", icon: Home },
  { href: "/orders", label: "Orders", icon: ListOrdered },
  { href: "/services", label: "Services", icon: Search },
  { href: "/combos", label: "Combos", icon: Layers },
  { href: "/settings", label: "Settings", icon: Settings },
  // Owner only; hidden for other users.
  { href: "/users", label: "Users", icon: Users },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/orders") {
    return pathname === "/orders" || (pathname.startsWith("/orders/") && pathname !== "/orders/new");
  }
  if (href === "/combos") {
    return pathname === "/combos" || pathname.startsWith("/combos/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  activeCount,
  showUsers = false,
}: {
  activeCount: number;
  showUsers?: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {items
        .filter((item) => item.href !== "/users" || showUsers)
        .map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground/80")} />
            <span className="flex-1">{label}</span>
            {href === "/orders" && activeCount > 0 ? (
              <span
                className="rounded-full bg-primary/10 px-1.5 text-[11px] font-semibold text-primary tabular-nums"
                title={`${activeCount} running`}
              >
                {activeCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function NewOrderLink({ className }: { className?: string }) {
  const { open } = useComposer();
  return (
    <button
      type="button"
      onClick={() => open()}
      title="New order (N)"
      className={cn(
        "relative flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-[0_1px_0_rgb(255_255_255/0.15)_inset,0_1px_2px_rgb(0_0_0/0.12)] transition-colors hover:bg-primary/90",
        className
      )}
    >
      <Plus className="size-4" />
      New order
      <kbd className="absolute right-2.5 hidden rounded border border-white/25 px-1 font-sans text-[10px] leading-4 text-white/80 lg:inline">
        N
      </kbd>
    </button>
  );
}

export function MobileTabBar({ activeCount }: { activeCount: number }) {
  const pathname = usePathname();
  const { open } = useComposer();
  const [overview, orders, services, combos, settings] = items;
  const tab = (item: (typeof items)[number]) => {
    const active = isActive(pathname, item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex flex-col items-center justify-center gap-1 text-[11px]",
          active ? "font-medium text-primary" : "text-muted-foreground"
        )}
      >
        <Icon className="size-5" />
        {item.label}
        {item.href === "/orders" && activeCount > 0 ? (
          <span className="absolute top-1.5 left-1/2 ml-2 size-2 rounded-full bg-primary ring-2 ring-background" />
        ) : null}
      </Link>
    );
  };
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-6 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {tab(overview)}
      {tab(orders)}
      <button
        type="button"
        onClick={() => open()}
        aria-label="New order"
        className="flex items-center justify-center"
      >
        <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <Plus className="size-5" />
        </span>
      </button>
      {tab(services)}
      {tab(combos)}
      {tab(settings)}
    </nav>
  );
}
