import { NextRequest } from "next/server";

export function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  // Vercel Cron may pass the secret in Authorization header when configured in dashboard
  const cronHeader = request.headers.get("x-cron-secret");
  return cronHeader === secret;
}
