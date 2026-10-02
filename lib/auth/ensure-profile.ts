import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import type { User } from "@supabase/supabase-js";

export async function ensureProfileForUser(
  user: User
): Promise<Tables<"profiles">> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return existing;

  const email = user.email ?? "";
  const username =
    (user.user_metadata?.username as string | undefined) ??
    email.split("@")[0] ??
    "user";

  const now = new Date().toISOString();
  const { data: created, error } = await admin
    .from("profiles")
    .insert({
      id: user.id,
      email,
      username,
      role: "customer",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error("PROFILE_PROVISION_FAILED");
  }

  const { data: wallet } = await admin
    .from("wallets")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!wallet) {
    await admin.from("wallets").insert({ user_id: user.id, currency: "PHP" });
  }

  return created;
}
