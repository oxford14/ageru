import { createAdminClient } from "@/lib/supabase/admin";
import type { OrderStatus } from "@/lib/supabase/database.types";
import { normalizeProviderStatus } from "@/lib/providers/normalize-status";
import type {
  CreateProviderOrderInput,
  CreateProviderOrderResult,
  ProviderBalance,
  ProviderOrderStatus,
  ProviderService,
  SocialServiceProvider,
} from "@/lib/providers/types";

let testOrderCounter = 10000;

const manualOrderState = new Map<
  string,
  {
    status: OrderStatus;
    quantity: number;
    createdAt: number;
  }
>();

function simulatorEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.MANUAL_PROVIDER_SIMULATOR !== "false";
}

function advanceManualStatus(orderId: string): ProviderOrderStatus {
  const state = manualOrderState.get(orderId);
  if (!state) {
    return {
      providerOrderId: orderId,
      status: "processing",
      remains: 0,
    };
  }

  const ageSec = (Date.now() - state.createdAt) / 1000;
  if (simulatorEnabled()) {
    if (ageSec > 30) state.status = "completed";
    else if (ageSec > 10) state.status = "in_progress";
    else state.status = "processing";
  }

  const delivered =
    state.status === "completed"
      ? state.quantity
      : state.status === "in_progress"
        ? Math.floor(state.quantity * 0.5)
        : 0;

  return {
    providerOrderId: orderId,
    status: normalizeProviderStatus(state.status),
    rawStatus: state.status,
    startCount: 0,
    currentCount: delivered,
    remains: Math.max(state.quantity - delivered, 0),
  };
}

export class ManualProvider implements SocialServiceProvider {
  readonly capabilities = {
    supportsRefill: false,
    supportsCancel: true,
    supportsBulkStatus: true,
  };

  constructor(
    public id: string,
    public name: string,
    private currency: string
  ) {}

  async getBalance(): Promise<ProviderBalance> {
    return { balance: "999999", currency: this.currency };
  }

  async getServices(): Promise<ProviderService[]> {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("services")
      .select("*")
      .eq("provider_id", this.id)
      .eq("is_demo", true);

    return (data ?? []).map((s) => ({
      providerServiceId: s.provider_service_id ?? s.id,
      name: s.name,
      rate: s.provider_rate,
      min: s.min_quantity,
      max: s.max_quantity,
      refill: s.refill_supported,
      cancel: s.cancel_supported,
      description: s.description ?? undefined,
    }));
  }

  async createOrder(
    input: CreateProviderOrderInput
  ): Promise<CreateProviderOrderResult> {
    testOrderCounter += 1;
    const providerOrderId = `TEST-${testOrderCounter}`;
    manualOrderState.set(providerOrderId, {
      status: "pending",
      quantity: input.quantity,
      createdAt: Date.now(),
    });
    return { providerOrderId, status: "processing" };
  }

  async getOrderStatus(orderId: string): Promise<ProviderOrderStatus> {
    return advanceManualStatus(orderId);
  }

  async getMultipleOrderStatuses(
    orderIds: string[]
  ): Promise<Record<string, ProviderOrderStatus>> {
    const out: Record<string, ProviderOrderStatus> = {};
    for (const id of orderIds) {
      out[id] = advanceManualStatus(id);
    }
    return out;
  }

  async cancelOrder(orderId: string) {
    const state = manualOrderState.get(orderId);
    if (state) state.status = "canceled";
    return { success: true };
  }
}
