"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, Loader2 } from "lucide-react";
import {
  getComposerCatalogAction,
  getComposerContextAction,
  type ComposerCatalog,
  type ComposerContext,
} from "@/app/actions/composer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LogoMark } from "@/components/app/logo-mark";
import { OrderComposer, type ComposerPrefill } from "@/components/composer/order-composer";

type ComposerApi = { open: (prefill?: ComposerPrefill) => void };

const ComposerContextValue = createContext<ComposerApi | null>(null);

export function useComposer() {
  const ctx = useContext(ComposerContextValue);
  if (!ctx) throw new Error("useComposer must be used inside <ComposerProvider>");
  return ctx;
}

const CATALOG_TTL = 10 * 60_000;

export function ComposerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(0);
  const [prefill, setPrefill] = useState<ComposerPrefill | null>(null);
  const [catalog, setCatalog] = useState<ComposerCatalog | null>(null);
  const [context, setContext] = useState<ComposerContext | null>(null);
  const [busy, setBusy] = useState(false);
  const catalogLoading = useRef<Promise<void> | null>(null);

  const loadCatalog = useCallback((force = false) => {
    if (catalogLoading.current) return catalogLoading.current;
    catalogLoading.current = getComposerCatalogAction()
      .then((res) => {
        setCatalog((prev) => (res.ok || force || !prev?.ok ? res : prev));
      })
      .catch(() => setCatalog({ ok: false, error: "Couldn't reach the server." }))
      .finally(() => {
        catalogLoading.current = null;
      });
    return catalogLoading.current;
  }, []);

  const openComposer = useCallback(
    (p?: ComposerPrefill) => {
      setPrefill(p ?? null);
      setSession((s) => s + 1);
      setContext(null);
      setOpen(true);
      getComposerContextAction()
        .then(setContext)
        .catch(() => setContext({ balance: null, currency: "USD", history: [], favorites: [] }));
      if (!catalog?.ok || Date.now() - catalog.loadedAt > CATALOG_TTL) void loadCatalog();
    },
    [catalog, loadCatalog]
  );

  // Warm the service list after the page settles so the composer opens instantly.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const id = idle(() => void loadCatalog());
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id as number);
  }, [loadCatalog]);

  // "N" opens the composer from anywhere (when not typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey || open) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
      e.preventDefault();
      openComposer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openComposer]);

  return (
    <ComposerContextValue.Provider value={{ open: openComposer }}>
      {children}
      <Suspense fallback={null}>
        <ComposeFromUrl onOpen={openComposer} />
      </Suspense>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          // Never close mid-send; the order is already on its way to the panel.
          if (!next && busy) return;
          setOpen(next);
        }}
      >
        <DialogContent
          className="grid h-dvh max-h-dvh w-full max-w-full grid-cols-1 grid-rows-1 gap-0 overflow-hidden rounded-none p-0 ring-0 sm:h-[min(760px,calc(100dvh-1.5rem))] sm:max-w-[960px] sm:rounded-xl sm:ring-1"
          showCloseButton={!busy}
        >
          <DialogTitle className="sr-only">New order</DialogTitle>
          {catalog?.ok ? (
            <OrderComposer
              key={session}
              catalog={catalog}
              context={context}
              prefill={prefill}
              onClose={() => setOpen(false)}
              onBusyChange={setBusy}
            />
          ) : catalog && !catalog.ok ? (
            <CatalogError message={catalog.error} onRetry={() => void loadCatalog(true)} />
          ) : (
            <CatalogLoading />
          )}
        </DialogContent>
      </Dialog>
    </ComposerContextValue.Provider>
  );
}

/** Supports deep links like /orders?compose=1&service=123&link=… */
function ComposeFromUrl({ onOpen }: { onOpen: (p?: ComposerPrefill) => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (params.get("compose") !== "1") return;
    const key = params.toString();
    if (handled.current === key) return;
    handled.current = key;
    const quantity = Number(params.get("quantity"));
    onOpen({
      serviceId: params.get("service") ?? undefined,
      customerId: params.get("customer") ?? undefined,
      customerName: params.get("customerName") ?? undefined,
      link: params.get("link") ?? undefined,
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : undefined,
    });
    const rest = new URLSearchParams(params);
    for (const k of ["compose", "service", "link", "quantity", "customer", "customerName"]) rest.delete(k);
    router.replace(rest.size ? `${pathname}?${rest}` : pathname, { scroll: false });
  }, [params, onOpen, router, pathname]);

  return null;
}

function CatalogLoading() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="relative">
        <LogoMark className="size-10 animate-pulse" />
      </div>
      <div>
        <p className="text-sm font-medium">Fetching services from your panel</p>
        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          The first load takes a few seconds, then it&apos;s instant.
        </p>
      </div>
    </div>
  );
}

function CatalogError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <CircleAlert className="size-6 text-destructive" />
      <p className="text-sm font-medium">Couldn&apos;t load services from the panel</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 h-9 rounded-lg border bg-card px-4 text-sm font-medium hover:bg-muted"
      >
        Try again
      </button>
    </div>
  );
}

export function ComposeButton({
  prefill,
  className,
  children,
}: {
  prefill?: ComposerPrefill;
  className?: string;
  children: React.ReactNode;
}) {
  const { open } = useComposer();
  return (
    <button type="button" onClick={() => open(prefill)} className={className}>
      {children}
    </button>
  );
}
