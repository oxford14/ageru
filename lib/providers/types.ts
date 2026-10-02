import type { OrderStatus } from "@/lib/supabase/database.types";

export interface ProviderBalance {
  balance: string;
  currency: string;
}

export interface ProviderService {
  providerServiceId: string;
  name: string;
  category?: string;
  rate: string;
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  description?: string;
}

export interface CreateProviderOrderInput {
  providerServiceId: string;
  targetUrl: string;
  quantity: number;
}

export interface CreateProviderOrderResult {
  providerOrderId: string;
  status?: OrderStatus;
}

export interface ProviderOrderStatus {
  providerOrderId: string;
  status: OrderStatus;
  startCount?: number;
  currentCount?: number;
  remains?: number;
  charge?: string;
  rawStatus?: string;
}

export interface RefillResult {
  success: boolean;
  message?: string;
}

export interface CancelResult {
  success: boolean;
  message?: string;
}

export interface ProviderCapabilities {
  supportsRefill: boolean;
  supportsCancel: boolean;
  supportsBulkStatus: boolean;
}

export interface SocialServiceProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  getBalance(): Promise<ProviderBalance>;
  getServices(): Promise<ProviderService[]>;
  createOrder(
    input: CreateProviderOrderInput
  ): Promise<CreateProviderOrderResult>;
  getOrderStatus(orderId: string): Promise<ProviderOrderStatus>;
  getMultipleOrderStatuses(
    orderIds: string[]
  ): Promise<Record<string, ProviderOrderStatus>>;
  refillOrder?(orderId: string): Promise<RefillResult>;
  cancelOrder?(orderId: string): Promise<CancelResult>;
}

export type ProviderRow = {
  id: string;
  name: string;
  type: string;
  api_url: string | null;
  encrypted_api_key: string | null;
  currency: string;
};
