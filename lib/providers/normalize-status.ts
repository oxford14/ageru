import type { OrderStatus } from "@/lib/supabase/database.types";

const STATUS_MAP: Record<string, OrderStatus> = {
  pending: "pending",
  processing: "processing",
  "in progress": "in_progress",
  in_progress: "in_progress",
  progress: "in_progress",
  completed: "completed",
  complete: "completed",
  partial: "partial",
  canceled: "canceled",
  cancelled: "canceled",
  cancel: "canceled",
  refunded: "refunded",
  refund: "refunded",
  failed: "failed",
  error: "failed",
  reject: "failed",
  rejected: "failed",
};

export function normalizeProviderStatus(raw: string): OrderStatus {
  const key = raw.trim().toLowerCase();
  return STATUS_MAP[key] ?? "processing";
}
