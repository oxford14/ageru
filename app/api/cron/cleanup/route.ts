import { jsonOk, jsonError } from "@/lib/api/response";
import { verifyCronSecret } from "@/lib/cron/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest } from "next/server";

async function handler(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return jsonError("Unauthorized", 401);
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("provider_api_logs")
    .delete()
    .lt("created_at", cutoff);

  if (error) return jsonError(error.message, 500);
  return jsonOk({ cleaned: true });
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
