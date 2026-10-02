import { jsonOk, jsonError } from "@/lib/api/response";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  if (!email) {
    return jsonError("Bootstrap not configured", 403);
  }

  const supabase = createAdminClient();

  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");

  if ((count ?? 0) > 0) {
    return jsonError("Admin already exists", 403);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    return jsonError("User not found. Register first.", 404);
  }

  await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", profile.id);

  return jsonOk({ promoted: profile.id });
}
