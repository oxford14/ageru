import type { OrderStatus } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const meta: Record<OrderStatus, { label: string; tone: string; dot: string }> = {
  pending: { label: "Queued", tone: "text-foreground/80", dot: "bg-warning" },
  processing: { label: "Starting", tone: "text-foreground/80", dot: "bg-primary animate-pulse" },
  in_progress: { label: "In progress", tone: "text-foreground", dot: "bg-primary animate-pulse" },
  completed: { label: "Completed", tone: "text-foreground", dot: "bg-success" },
  partial: { label: "Partial", tone: "text-foreground", dot: "bg-warning" },
  canceled: { label: "Cancelled", tone: "text-muted-foreground", dot: "bg-muted-foreground/50" },
  refunded: { label: "Refunded", tone: "text-muted-foreground", dot: "bg-muted-foreground/50" },
  failed: { label: "Failed", tone: "text-destructive", dot: "bg-destructive" },
  provider_failed: { label: "Not placed", tone: "text-destructive", dot: "bg-destructive" },
};

export function statusLabel(status: OrderStatus) {
  return meta[status].label;
}

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  const m = meta[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap",
        m.tone,
        className
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", m.dot)} aria-hidden />
      {m.label}
    </span>
  );
}
