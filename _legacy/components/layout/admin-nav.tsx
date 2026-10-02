"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { branding } from "@/lib/config/branding";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/services/import", label: "Import Services" },
  { href: "/admin/providers", label: "Providers" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/transactions", label: "Transactions" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-64 flex-col border-r bg-card min-h-screen p-4">
      <div className="mb-8 px-2">
        <p className="text-lg font-semibold">{branding.shortName} Admin</p>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-md px-3 py-2 text-sm",
              pathname === href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {label}
          </Link>
        ))}
        <Link href="/dashboard" className="mt-4 text-sm text-muted-foreground hover:underline px-3">
          ← Customer panel
        </Link>
      </nav>
    </aside>
  );
}
