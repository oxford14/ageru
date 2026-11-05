import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { branding } from "@/lib/config/branding";
import { formatMoney } from "@/lib/money";
import { LogoMark } from "@/components/app/logo-mark";
import { ResellerNav } from "@/components/reseller/reseller-nav";
import { Button } from "@/components/ui/button";

export function ResellerShell({
  email,
  balancePhp,
  children,
}: {
  email: string;
  balancePhp: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <Link href="/reseller/dashboard" className="flex h-16 items-center gap-2.5 px-5">
          <LogoMark className="size-6" />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">{branding.appName}</span>
        </Link>
        <div className="px-3">
          <ResellerNav />
        </div>
        <div className="mt-auto space-y-4 p-3">
          <div className="rounded-lg border bg-background/60 p-3.5">
            <p className="text-xs text-muted-foreground">Wallet balance</p>
            <p className="mt-1 text-xl font-semibold tabular-nums tracking-[-0.02em]">
              {formatMoney(balancePhp, "PHP")}
            </p>
            <Link
              href="/reseller/wallet/fund"
              className="mt-2 inline-block text-[13px] font-medium text-primary hover:underline"
            >
              Fund account
            </Link>
          </div>
          <p className="truncate px-1 text-xs text-muted-foreground">{email}</p>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm" className="w-full justify-start gap-2">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
