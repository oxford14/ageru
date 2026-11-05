import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/auth/owner";
import type { Tables, UserRole } from "@/lib/supabase/database.types";
import type { User } from "@supabase/supabase-js";

function targetRoleForUser(user: User, current: UserRole): UserRole {
  const email = user.email ?? "";
  if (isOwnerEmail(email)) return "super_admin";
  if (current === "admin") return "super_admin";
  if (current === "customer") return "reseller";
  return current;
}

/** Promote owner / migrate legacy roles using service role (never client). */
export async function syncProfileRole(
  user: User,
  profile: Tables<"profiles">
): Promise<Tables<"profiles">> {
  const next = targetRoleForUser(user, profile.role);
  if (next === profile.role) return profile;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ role: next, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error || !data) return profile;
  return data;
}
