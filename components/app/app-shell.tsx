import Link from "next/link";
import { ArrowUpRight, LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { branding } from "@/lib/config/branding";
import { getPanelConfig, tryGetBalance } from "@/lib/panel";
import { formatCurrency } from "@/lib/panel/shared";
import { LogoMark } from "@/components/app/logo-mark";
import { MobileTabBar, NewOrderLink, SidebarNav } from "@/components/app/app-nav";
import { ComposerProvider } from "@/components/composer/composer-provider";

export async function AppShell({
  email,
  activeCount,
  isAccountOwner = false,
  children,
}: {
  email: string;
  activeCount: number;
  /** Shows owner-only navigation such as Users. */
  isAccountOwner?: boolean;
  children: React.ReactNode;
}) {
  const cfg = getPanelConfig();
  const balance = await tryGetBalance();

  return (
    <ComposerProvider>
      <div className="flex min-h-screen w-full">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
          <Link href="/dashboard" className="flex h-16 items-center gap-2.5 px-5">
            <LogoMark className="size-6" />
            <span className="text-[15px] font-semibold tracking-[-0.01em]">{branding.appName}</span>
          </Link>

          <div className="px-3">
            <NewOrderLink className="w-full" />
          </div>

          <div className="mt-5 px-3">
            <SidebarNav activeCount={activeCount} showUsers={isAccountOwner} />
          </div>

          <div className="mt-auto space-y-4 p-3">
            <div className="rounded-lg border bg-background/60 p-3.5">
              <p className="text-xs text-muted-foreground">{cfg?.name ?? "Panel"} balance</p>
              {balance.ok ? (
                <p className="mt-1 text-xl font-semibold tracking-[-0.02em] tabular-nums">
                  {formatCurrency(balance.balance, balance.currency)}
                </p>
              ) : (
                <p className="mt-1 text-sm text-destructive">Not connected</p>
              )}
              {cfg?.topUpUrl ? (
                <a
                  href={cfg.topUpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-0.5 text-[13px] font-medium text-primary hover:underline"
                >
                  Add funds
                  <ArrowUpRight className="size-3.5" />
                </a>
              ) : null}
            </div>

            <div className="flex items-center gap-2 px-1">
              <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={email}>
                {email}
              </p>
              <form action={signOut}>
                <button
                  type="submit"
                  title="Sign out"
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="size-3.5" />
                  <span className="sr-only">Sign out</span>
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
            <Link href="/dashboard" className="flex items-center gap-2">
              <LogoMark className="size-6" />
              <span className="text-[15px] font-semibold">{branding.shortName}</span>
            </Link>
            {balance.ok ? (
              <a
                href={cfg?.topUpUrl || undefined}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border bg-card px-3 py-1 text-[13px] font-medium tabular-nums"
              >
                {formatCurrency(balance.balance, balance.currency)}
              </a>
            ) : null}
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 md:px-8 md:pt-10 md:pb-12">
            {children}
          </main>
        </div>

        <MobileTabBar activeCount={activeCount} />
      </div>
    </ComposerProvider>
  );
}
