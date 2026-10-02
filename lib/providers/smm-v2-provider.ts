import {
  ProviderError,
  ProviderErrorCode,
} from "@/lib/providers/errors";
import { normalizeProviderStatus } from "@/lib/providers/normalize-status";
import type {
  CreateProviderOrderInput,
  CreateProviderOrderResult,
  ProviderBalance,
  ProviderOrderStatus,
  ProviderService,
  SocialServiceProvider,
} from "@/lib/providers/types";

type SmmV2Config = {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  currency: string;
};

function redactBody(body: Record<string, unknown>) {
  const copy = { ...body };
  if ("key" in copy) copy.key = "[REDACTED]";
  return copy;
}

export class SmmV2Provider implements SocialServiceProvider {
  readonly capabilities = {
    supportsRefill: true,
    supportsCancel: true,
    supportsBulkStatus: true,
  };

  constructor(private config: SmmV2Config) {}

  get id() {
    return this.config.id;
  }

  get name() {
    return this.config.name;
  }

  private async post<T>(
    body: Record<string, unknown>,
    timeoutMs = 30000
  ): Promise<{ data: T; status: number; request: Record<string, unknown>; raw: unknown }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const params = new URLSearchParams();
      params.set("key", this.config.apiKey);
      for (const [k, v] of Object.entries(body)) {
        if (v !== undefined && v !== null) params.set(k, String(v));
      }

      const res = await fetch(this.config.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        signal: controller.signal,
      });
      const raw = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new ProviderError(
          ProviderErrorCode.PROVIDER_UNAVAILABLE,
          `HTTP ${res.status}`
        );
      }
      return {
        data: raw as T,
        status: res.status,
        request: redactBody({ ...body }),
        raw,
      };
    } catch (e) {
      if (e instanceof ProviderError) throw e;
      if (e instanceof Error && e.name === "AbortError") {
        throw new ProviderError(ProviderErrorCode.PROVIDER_TIMEOUT);
      }
      throw new ProviderError(ProviderErrorCode.UNKNOWN_PROVIDER_ERROR);
    } finally {
      clearTimeout(timer);
    }
  }

  async getBalance(): Promise<ProviderBalance> {
    const { data } = await this.post<{ balance?: string; currency?: string }>({
      action: "balance",
    });
    return {
      balance: String(data.balance ?? "0"),
      currency: data.currency ?? this.config.currency,
    };
  }

  async getServices(): Promise<ProviderService[]> {
    const { data } = await this.post<
      Array<{
        service: string | number;
        name: string;
        rate: string;
        min: string | number;
        max: string | number;
        refill?: boolean;
        cancel?: boolean;
        category?: string;
        desc?: string;
      }>
    >({ action: "services" });

    if (!Array.isArray(data)) return [];

    return data.map((s) => ({
      providerServiceId: String(s.service),
      name: s.name,
      category: s.category,
      rate: String(s.rate),
      min: Number(s.min),
      max: Number(s.max),
      refill: Boolean(s.refill),
      cancel: Boolean(s.cancel),
      description: s.desc,
    }));
  }

  async createOrder(
    input: CreateProviderOrderInput
  ): Promise<CreateProviderOrderResult> {
    const { data, raw } = await this.post<{ order?: string | number; error?: string }>({
      action: "add",
      service: input.providerServiceId,
      link: input.targetUrl,
      quantity: input.quantity,
    });

    if (data.error || !data.order) {
      const msg = String(data.error ?? raw);
      if (/balance/i.test(msg)) {
        throw new ProviderError(ProviderErrorCode.INSUFFICIENT_PROVIDER_BALANCE, msg);
      }
      throw new ProviderError(ProviderErrorCode.ORDER_REJECTED, msg);
    }

    return {
      providerOrderId: String(data.order),
      status: "processing",
    };
  }

  private mapStatusItem(
    orderId: string,
    item: Record<string, unknown>
  ): ProviderOrderStatus {
    const rawStatus = String(item.status ?? "processing");
    const remains = item.remains != null ? Number(item.remains) : undefined;
    const startCount =
      item.start_count != null ? Number(item.start_count) : undefined;
    return {
      providerOrderId: orderId,
      status: normalizeProviderStatus(rawStatus),
      rawStatus,
      remains,
      startCount,
      currentCount:
        startCount != null && remains != null
          ? startCount + (Number(item.quantity ?? 0) - remains)
          : undefined,
      charge: item.charge != null ? String(item.charge) : undefined,
    };
  }

  async getOrderStatus(orderId: string): Promise<ProviderOrderStatus> {
    const { data } = await this.post<Record<string, unknown>>({
      action: "status",
      order: orderId,
    });
    return this.mapStatusItem(orderId, data);
  }

  async getMultipleOrderStatuses(
    orderIds: string[]
  ): Promise<Record<string, ProviderOrderStatus>> {
    if (orderIds.length === 0) return {};
    const { data } = await this.post<Record<string, Record<string, unknown>>>({
      action: "status",
      orders: orderIds.join(","),
    });

    const result: Record<string, ProviderOrderStatus> = {};
    for (const id of orderIds) {
      const item = data[id];
      if (item) result[id] = this.mapStatusItem(id, item);
    }
    return result;
  }

  async refillOrder(orderId: string) {
    const { data } = await this.post<{ refill?: string | number; error?: string }>({
      action: "refill",
      order: orderId,
    });
    if (data.error) return { success: false, message: String(data.error) };
    return { success: true, message: data.refill ? String(data.refill) : undefined };
  }

  async cancelOrder(orderId: string) {
    const { data, raw } = await this.post<
      | Array<{ order: number; cancel: number | { error: string } }>
      | { cancel?: string | number; error?: string }
    >({
      action: "cancel",
      orders: orderId,
    });

    if (Array.isArray(data)) {
      const item = data.find((row) => String(row.order) === orderId);
      const cancel = item?.cancel;
      if (cancel && typeof cancel === "object" && "error" in cancel) {
        return { success: false, message: String(cancel.error) };
      }
      return { success: true };
    }

    if (data && typeof data === "object" && "error" in data && data.error) {
      return { success: false, message: String(data.error) };
    }
    if (!data && raw) {
      return { success: false, message: String(raw) };
    }
    return { success: true };
  }
}
