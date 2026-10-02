"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { refreshOrdersAction } from "@/app/actions/orders";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 45_000;

/**
 * Keeps order statuses fresh while the page is open: checks the panel on
 * mount and every 45s while there are running orders and the tab is visible.
 */
export function OrderSync({ active, className }: { active: boolean; className?: string }) {
  const router = useRouter();
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);

  const run = useCallback(
    (force: boolean) => {
      if (busy.current) return;
      busy.current = true;
      startTransition(async () => {
        const res = await refreshOrdersAction(force);
        busy.current = false;
        if (!res.ok) {
          if (force) toast.error(res.error);
          return;
        }
        setCheckedAt(Date.now());
        router.refresh();
      });
    },
    [router]
  );

  useEffect(() => {
    if (!active) return;
    run(false);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") run(false);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [active, run]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const label = pending
    ? "Checking…"
    : checkedAt
      ? now - checkedAt < 30_000
        ? "Updated just now"
        : `Updated ${Math.round((now - checkedAt) / 60_000) || 1} min ago`
      : active
        ? "Live"
        : null;

  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      {label ? <span aria-live="polite">{label}</span> : null}
      <button
        type="button"
        onClick={() => run(true)}
        disabled={pending}
        className="inline-flex h-7 items-center gap-1.5 rounded-md border bg-card px-2.5 font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
      >
        <RefreshCw className={cn("size-3.5", pending && "animate-spin")} />
        Refresh
      </button>
    </div>
  );
}
