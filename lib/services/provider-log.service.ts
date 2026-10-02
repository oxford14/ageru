import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

export async function logProviderApiCall(input: {
  providerId: string;
  operation: string;
  internalOrderId?: string;
  requestMetadata?: Record<string, unknown>;
  responseMetadata?: Record<string, unknown>;
  statusCode?: number;
  success: boolean;
  errorMessage?: string;
}) {
  const supabase = createAdminClient();
  await supabase.from("provider_api_logs").insert({
    provider_id: input.providerId,
    operation: input.operation,
    internal_order_id: input.internalOrderId ?? null,
    request_metadata: (input.requestMetadata ?? null) as Json,
    response_metadata: (input.responseMetadata ?? null) as Json,
    status_code: input.statusCode ?? null,
    success: input.success,
    error_message: input.errorMessage ?? null,
  });
}
