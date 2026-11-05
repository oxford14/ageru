"use server";

import { redirect } from "next/navigation";
import { homePathForRole } from "@/lib/auth/roles";
import { ensureProfileForUser } from "@/lib/auth/ensure-profile";
import { syncProfileRole } from "@/lib/auth/sync-profile-role";
import { createClient } from "@/lib/supabase/server";

async function redirectAfterAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let profile = await ensureProfileForUser(user);
  profile = await syncProfileRole(user, profile);
  redirect(homePathForRole(profile.role, user.email));
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  await redirectAfterAuth();
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });
  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }
  await redirectAfterAuth();
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
