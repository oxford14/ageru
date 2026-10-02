import { ProviderError, ProviderErrorCode } from "@/lib/providers/errors";

/**
 * Thin client for a standard "SMM panel API v2" (PanelFollows, SMM World, and
 * most Perfect Panel based providers). All calls are form-encoded POSTs with the
 * API key in the body, so this must only ever run on the server.
 */

export type RawPanelService = {
  service: number | string;
  name: string;
  type?: string;
  category?: string;
  rate: string | number;
  min: number | string;
  max: number | string;
  dripfeed?: boolean;
  refill?: boolean;
  cancel?: boolean;
  /** Only v3 panels send these. */
  platform?: string;
  description?: string;
  avgSeconds?: number | null;
};

export type RawPanelStatus = {
  charge?: string | number;
  start_count?: string | number | null;
  status?: string;
  remains?: string | number | null;
  currency?: string;
  error?: string;
};

export type AddOrderParams = {
  service: string;
  link: string;
  quantity?: number;
  comments?: string;
  username?: string;
  answer_number?: string;
};

export class SmmPanel {
  constructor(
    private apiUrl: string,
    private apiKey: string
  ) {}

  private async call<T>(
    body: Record<string, string | number | undefined>,
    timeoutMs = 30_000
  ): Promise<T> {
    const params = new URLSearchParams({ key: this.apiKey });
    for (const [k, v] of Object.entries(body)) {
      if (v !== undefined && v !== "") params.set(k, String(v));
    }

    let res: Response;
    try {
      res = await fetch(this.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
    } catch (e) {
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
        throw new ProviderError(ProviderErrorCode.PROVIDER_TIMEOUT, "The panel took too long to respond.");
      }
      throw new ProviderError(ProviderErrorCode.PROVIDER_UNAVAILABLE, "Could not reach the panel.");
    }

    if (!res.ok) {
      throw new ProviderError(
        ProviderErrorCode.PROVIDER_UNAVAILABLE,
        `The panel returned HTTP ${res.status}.`
      );
    }

    const json = (await res.json().catch(() => null)) as T | null;
    if (json === null) {
      throw new ProviderError(
        ProviderErrorCode.UNKNOWN_PROVIDER_ERROR,
        "The panel returned an unreadable response."
      );
    }
    if (typeof json === "object" && json && "error" in json && !Array.isArray(json)) {
      const err = (json as { error?: unknown }).error;
      // Single-object responses use { error } for failures. Multi-status maps
      // are keyed by order id and never have a top-level "error" key.
      if (typeof err === "string" && err) {
        const code = /balance|fund/i.test(err)
          ? ProviderErrorCode.INSUFFICIENT_PROVIDER_BALANCE
          : ProviderErrorCode.ORDER_REJECTED;
        throw new ProviderError(code, err);
      }
    }
    return json;
  }

  balance() {
    return this.call<{ balance: string; currency: string }>({ action: "balance" });
  }

  services() {
    return this.call<RawPanelService[]>({ action: "services" }, 60_000);
  }

  add(params: AddOrderParams & { idempotencyKey?: string }) {
    void params.idempotencyKey;
    return this.call<{ order: number | string }>({ action: "add", ...params });
  }

  /** Up to 100 ids per call. Unknown ids come back as { error }. */
  statuses(ids: string[]) {
    return this.call<Record<string, RawPanelStatus>>({
      action: "status",
      orders: ids.join(","),
    });
  }

  refill(orderId: string) {
    return this.call<{ refill?: number | string }>({ action: "refill", order: orderId });
  }

  cancel(orderId: string) {
    return this.call<Array<{ order: number | string; cancel: number | { error: string } }>>({
      action: "cancel",
      orders: orderId,
    });
  }
}
