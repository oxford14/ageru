"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListOrdered, Search, User, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/reseller/dashboard", label: "Overview", icon: Home },
  { href: "/reseller/services", label: "Services", icon: Search },
  { href: "/reseller/requests", label: "Requests", icon: ListOrdered },
  { href: "/reseller/wallet", label: "Wallet", icon: Wallet },
  { href: "/reseller/profile", label: "Profile", icon: User },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ResellerNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Reseller">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
              active
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground/80")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
