export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "customer" | "admin";
export type OrderStatus =
  | "pending"
  | "processing"
  | "in_progress"
  | "completed"
  | "partial"
  | "canceled"
  | "refunded"
  | "failed"
  | "provider_failed";
export type TransactionType =
  | "deposit"
  | "order"
  | "refund"
  | "adjustment"
  | "bonus";
export type TransactionStatus = "pending" | "completed" | "failed" | "canceled";
export type PaymentStatus = "pending" | "paid" | "failed" | "expired" | "canceled";
export type TargetInputType = "url" | "username" | "custom";
export type ProviderHealth = "healthy" | "degraded" | "down" | "unknown";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type ProfileRow = {
  id: string;
  email: string;
  username: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type PlatformRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
};

export type CategoryRow = {
  id: string;
  platform_id: string;
  name: string;
  slug: string;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type ProviderRow = {
  id: string;
  name: string;
  type: string;
  api_url: string | null;
  encrypted_api_key: string | null;
  currency: string;
  enabled: boolean;
  priority: number;
  markup_percentage: string;
  last_balance: string | null;
  last_sync_at: string | null;
  health_status: ProviderHealth;
  created_at: string;
  updated_at: string;
};

export type ServiceRow = {
  id: string;
  platform_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  service_type: string;
  target_input_type: TargetInputType;
  provider_id: string | null;
  provider_service_id: string | null;
  provider_rate: string;
  customer_rate: string;
  min_quantity: number;
  max_quantity: number;
  speed: string | null;
  start_time: string | null;
  refill_supported: boolean;
  cancel_supported: boolean;
  is_demo: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ComboPlanRow = {
  id: string;
  name: string;
  description: string;
  platform: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type CustomerRow = {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ComboPlanItemRow = {
  id: string;
  plan_id: string;
  sort_order: number;
  label: string;
  link_label: string;
  link_placeholder: string;
  default_quantity: number | null;
  category_hint: string | null;
  service_id: string | null;
  created_at: string;
};

export type OrderRow = {
  id: string;
  order_number: string;
  user_id: string;
  service_id: string | null;
  provider_id: string | null;
  provider_order_id: string | null;
  provider_service_id: string | null;
  service_name: string | null;
  service_type: string | null;
  service_category: string | null;
  rate: string | null;
  currency: string;
  refill_supported: boolean;
  cancel_supported: boolean;
  order_params: Json;
  provider_status: string | null;
  last_synced_at: string | null;
  refill_requested_at: string | null;
  cancel_requested_at: string | null;
  target_url: string;
  quantity: number;
  start_count: number | null;
  current_count: number | null;
  remains: number | null;
  provider_cost: string;
  customer_charge: string;
  profit: string;
  status: OrderStatus;
  error_message: string | null;
  idempotency_key: string;
  combo_group_id: string | null;
  combo_plan_id: string | null;
  customer_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type WalletRow = {
  id: string;
  user_id: string;
  balance: string;
  currency: string;
  updated_at: string;
};

export type TransactionRow = {
  id: string;
  user_id: string;
  wallet_id: string;
  type: TransactionType;
  amount: string;
  balance_before: string;
  balance_after: string;
  reference_type: string | null;
  reference_id: string | null;
  status: TransactionStatus;
  description: string | null;
  idempotency_key: string | null;
  created_at: string;
};

export type PaymentRow = {
  id: string;
  user_id: string;
  transaction_id: string | null;
  provider: string;
  external_id: string | null;
  checkout_url: string | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  idempotency_key: string;
  webhook_event_id: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type ProviderApiLogRow = {
  id: string;
  provider_id: string | null;
  operation: string;
  internal_order_id: string | null;
  request_metadata: Json | null;
  response_metadata: Json | null;
  status_code: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Json;
  ip_address: string | null;
  created_at: string;
};

export type SupportTicketRow = {
  id: string;
  user_id: string;
  subject: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
};

export type SupportTicketMessageRow = {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_staff: boolean;
  created_at: string;
};

export type FavoriteServiceRow = {
  user_id: string;
  service_id: string;
  created_at: string;
};

export type AppSettingRow = {
  key: string;
  value: Json;
  updated_at: string;
};

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type TableDef<
  Row,
  Insert = Partial<Row>,
  Update = Partial<Row>,
  Relationships extends Relationship[] = [],
> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<
        ProfileRow,
        ProfileRow,
        Partial<ProfileRow>,
        [
          {
            foreignKeyName: "wallets_user_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "wallets";
            referencedColumns: ["user_id"];
          },
        ]
      >;
      platforms: TableDef<PlatformRow>;
      categories: TableDef<
        CategoryRow,
        Partial<CategoryRow>,
        Partial<CategoryRow>,
        [
          {
            foreignKeyName: "categories_platform_id_fkey";
            columns: ["platform_id"];
            isOneToOne: false;
            referencedRelation: "platforms";
            referencedColumns: ["id"];
          },
        ]
      >;
      providers: TableDef<ProviderRow>;
      services: TableDef<
        ServiceRow,
        Partial<ServiceRow>,
        Partial<ServiceRow>,
        [
          {
            foreignKeyName: "services_platform_id_fkey";
            columns: ["platform_id"];
            isOneToOne: false;
            referencedRelation: "platforms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "services_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ]
      >;
      combo_plans: TableDef<
        ComboPlanRow,
        Partial<ComboPlanRow>,
        Partial<ComboPlanRow>
      >;
      combo_plan_items: TableDef<
        ComboPlanItemRow,
        Partial<ComboPlanItemRow>,
        Partial<ComboPlanItemRow>,
        [
          {
            foreignKeyName: "combo_plan_items_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "combo_plans";
            referencedColumns: ["id"];
          },
        ]
      >;
      customers: TableDef<
        CustomerRow,
        Partial<CustomerRow>,
        Partial<CustomerRow>
      >;
      orders: TableDef<
        OrderRow,
        Partial<OrderRow>,
        Partial<OrderRow>,
        [
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ]
      >;
      wallets: TableDef<
        WalletRow,
        Partial<WalletRow>,
        Partial<WalletRow>,
        [
          {
            foreignKeyName: "wallets_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      transactions: TableDef<
        TransactionRow,
        Partial<TransactionRow>,
        Partial<TransactionRow>,
        [
          {
            foreignKeyName: "transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      payments: TableDef<PaymentRow>;
      provider_api_logs: TableDef<ProviderApiLogRow>;
      audit_logs: TableDef<
        AuditLogRow,
        Partial<AuditLogRow>,
        Partial<AuditLogRow>,
        [
          {
            foreignKeyName: "audit_logs_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      support_tickets: TableDef<SupportTicketRow>;
      support_ticket_messages: TableDef<SupportTicketMessageRow>;
      app_settings: TableDef<AppSettingRow>;
      favorite_services: TableDef<FavoriteServiceRow>;
    };
    Views: Record<string, never>;
    Functions: {
      wallet_reserve_for_order: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_order_id: string;
          p_idempotency_key: string;
        };
        Returns: { new_balance: number; transaction_id: string };
      };
      wallet_credit_deposit: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_idempotency_key: string;
          p_description?: string;
        };
        Returns: { new_balance: number; transaction_id: string };
      };
      wallet_refund_order: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_order_id: string;
          p_idempotency_key: string;
        };
        Returns: { new_balance: number; transaction_id: string };
      };
      wallet_admin_adjustment: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_description: string;
          p_idempotency_key: string;
        };
        Returns: { new_balance: number; transaction_id: string };
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
