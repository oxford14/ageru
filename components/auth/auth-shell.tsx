import Link from "next/link";
import { branding } from "@/lib/config/branding";
import { LogoMark } from "@/components/app/logo-mark";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-[400px]">
        <Link href="/login" className="mb-8 flex items-center gap-2.5">
          <LogoMark className="size-7" />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">{branding.appName}</span>
        </Link>
        <div className="rounded-xl border bg-card p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
