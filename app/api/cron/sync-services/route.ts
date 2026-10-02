import { jsonOk, jsonError } from "@/lib/api/response";
import { verifyCronSecret } from "@/lib/cron/auth";
import { NextRequest } from "next/server";

/** Placeholder for optional provider service rate refresh — extend per provider. */
async function handler(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return jsonError("Unauthorized", 401);
  }
  return jsonOk({ synced: 0, message: "No automatic service sync configured" });
}

export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}
