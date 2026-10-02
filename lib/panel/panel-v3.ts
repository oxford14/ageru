import { ProviderError, ProviderErrorCode } from "@/lib/providers/errors";
import type {
  AddOrderParams,
  RawPanelService,
  RawPanelStatus,
} from "@/lib/panel/smm-panel";

type V3ErrorBody = {
  object?: string;
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
};

type V3Service = {
  id: number;
  name: string;
  type?: string;
  platform?: string;
  category?: { name?: string; slug?: string };
  pricing?: { rate?: string; unit?: string };
  limits?: { min?: number; max?: number };
  features?: { refill?: boolean; cancel?: boolean; dripfeed?: boolean };
  is_active?: boolean;
  description?: string;
  average_time_seconds?: number | null;
};

type V3Order = {
  id: number | string;
  status?: string;
  status_label?: string;
  charge?: string;
  start_count?: number | null;
  remains?: number | null;
  currency?: string;
};

export class PanelV3 {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private headers(extra?: Record<string, string>) {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
      ...extra,
    };
  }

  private async request<T>(
    path: string,
    init: RequestInit & { timeoutMs?: number } = {}
  ): Promise<T> {
    const { timeoutMs = 30_000, ...fetchInit } = init;
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        ...fetchInit,
        headers: { ...this.headers(), ...(fetchInit.headers as Record<string, string>) },
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch (e) {
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
        throw new ProviderError(ProviderErrorCode.PROVIDER_TIMEOUT, "The panel took too long to respond.");
      }
      throw new ProviderError(ProviderErrorCode.PROVIDER_UNAVAILABLE, "Could not reach the panel.");
    }

    const json = (await res.json().catch(() => null)) as T | V3ErrorBody | null;
    if (!res.ok) {
      const err = json && typeof json === "object" && "error" in json ? (json as V3ErrorBody).error : null;
      const message = err?.message ?? `The panel returned HTTP ${res.status}.`;
      const code =
        res.status === 402 || /balance|fund/i.test(message)
          ? ProviderErrorCode.INSUFFICIENT_PROVIDER_BALANCE
          : res.status === 400 || res.status === 422
            ? ProviderErrorCode.ORDER_REJECTED
            : ProviderErrorCode.PROVIDER_UNAVAILABLE;
      throw new ProviderError(code, message);
    }
    if (json === null) {
      throw new ProviderError(ProviderErrorCode.UNKNOWN_PROVIDER_ERROR, "Unreadable panel response.");
    }
    return json as T;
  }

  async balance() {
    const data = await this.request<{ balance?: string; currency?: string }>("/account");
    return {
      balance: String(data.balance ?? "0"),
      currency: data.currency ?? "USD",
    };
  }

  async services(): Promise<RawPanelService[]> {
    const out: RawPanelService[] = [];
    let cursor: string | undefined;
    for (;;) {
      const qs = new URLSearchParams({ limit: "500" });
      if (cursor) qs.set("starting_after", cursor);
      const page = await this.request<{
        data?: V3Service[];
        has_more?: boolean;
        next_cursor?: string | null;
      }>(`/services?${qs}`, { timeoutMs: 120_000 });

      for (const s of page.data ?? []) {
        if (!s.is_active) continue;
        out.push({
          service: s.id,
          name: s.name,
          type: s.type,
          category: s.category?.name ?? s.platform,
          rate: s.pricing?.rate ?? "0",
          min: s.limits?.min ?? 1,
          max: s.limits?.max ?? 1,
          refill: Boolean(s.features?.refill),
          cancel: Boolean(s.features?.cancel),
          dripfeed: Boolean(s.features?.dripfeed),
          platform: s.platform,
          description: s.description,
          avgSeconds: s.average_time_seconds ?? null,
        });
      }

      if (!page.has_more || !page.next_cursor) break;
      cursor = String(page.next_cursor);
    }
    return out;
  }

  async add(params: AddOrderParams & { idempotencyKey?: string }) {
    const body: Record<string, string | number> = {
      service: Number(params.service),
      link: params.link,
    };
    if (params.quantity != null) body.quantity = params.quantity;
    if (params.comments) body.comments = params.comments;
    if (params.username) body.username = params.username;
    if (params.answer_number) body.answer_number = params.answer_number;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (params.idempotencyKey) headers["Idempotency-Key"] = params.idempotencyKey;

    const data = await this.request<V3Order>("/orders", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!data.id) {
      throw new ProviderError(ProviderErrorCode.ORDER_REJECTED, "The panel did not return an order id.");
    }
    return { order: data.id };
  }

  private mapOrder(id: string, order: V3Order): RawPanelStatus {
    return {
      charge: order.charge,
      start_count: order.start_count,
      status: order.status_label ?? order.status,
      remains: order.remains,
      currency: order.currency,
    };
  }

  async statuses(ids: string[]): Promise<Record<string, RawPanelStatus>> {
    const result: Record<string, RawPanelStatus> = {};
    const chunkSize = 15;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (id) => {
          try {
            const order = await this.request<V3Order>(`/orders/${encodeURIComponent(id)}`);
            result[id] = this.mapOrder(id, order);
          } catch {
            result[id] = { error: "Incorrect order ID" };
          }
        })
      );
    }
    return result;
  }

  async refill(orderId: string) {
    await this.request(`/orders/${encodeURIComponent(orderId)}/refill`, { method: "POST" });
    return { refill: orderId };
  }

  async cancel(orderId: string) {
    await this.request(`/orders/${encodeURIComponent(orderId)}/cancel`, { method: "POST" });
    return [{ order: orderId, cancel: 1 }];
  }
}
