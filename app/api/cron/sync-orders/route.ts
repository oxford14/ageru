import { jsonOk, jsonError } from "@/lib/api/response";
import { verifyCronSecret } from "@/lib/cron/auth";
import { syncActiveOrders } from "@/lib/services/sync-orders.service";
import { NextRequest } from "next/server";

async function handler(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return jsonError("Unauthorized", 401);
  }
  const result = await syncActiveOrders({ force: true });
  return jsonOk(result);
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
