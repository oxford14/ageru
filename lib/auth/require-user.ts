import { ensureProfileForUser } from "@/lib/auth/ensure-profile";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type SessionUser = {
  id: string;
  email: string;
  profile: Tables<"profiles">;
};

export async function requireUser(): Promise<SessionUser> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("UNAUTHORIZED");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    try {
      const provisioned = await ensureProfileForUser(user);
      return {
        id: user.id,
        email: user.email ?? provisioned.email,
        profile: provisioned,
      };
    } catch {
      throw new Error("UNAUTHORIZED");
    }
  }

  return {
    id: user.id,
    email: user.email ?? profile.email,
    profile,
  };
}
