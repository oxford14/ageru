"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cancelOrderAction, refillOrderAction } from "@/app/actions/orders";

const secondary =
  "inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-[13px] font-medium transition-colors hover:bg-muted disabled:opacity-50";

export function RefillButton({ orderId, requestedAt }: { orderId: string; requestedAt: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className={secondary}
      disabled={pending}
      title={requestedAt ? `Last requested ${new Date(requestedAt).toLocaleString()}` : undefined}
      onClick={() =>
        start(async () => {
          const res = await refillOrderAction(orderId);
          if (res.ok) {
            toast.success("Refill requested");
            router.refresh();
          } else toast.error(res.error);
        })
      }
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
      Request refill
    </button>
  );
}

export function CancelButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <button type="button" className={`${secondary} text-destructive`} onClick={() => setConfirming(true)}>
        Cancel order
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-[13px]">
      <span className="text-muted-foreground">Cancel on the panel?</span>
      <button
        type="button"
        disabled={pending}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-destructive px-3 font-medium text-white hover:bg-destructive/90 disabled:opacity-60"
        onClick={() =>
          start(async () => {
            const res = await cancelOrderAction(orderId);
            if (res.ok) {
              toast.success("Cancellation requested");
              setConfirming(false);
              router.refresh();
            } else toast.error(res.error);
          })
        }
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        Yes, cancel
      </button>
      <button type="button" className="font-medium text-muted-foreground hover:text-foreground" onClick={() => setConfirming(false)}>
        Keep
      </button>
    </span>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn't copy");
        }
      }}
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      title={label}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      <span className="sr-only">{label}</span>
    </button>
  );
}
