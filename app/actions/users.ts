"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isOwnerEmail, requireAccountOwner } from "@/lib/auth/owner";
import { createAdminClient } from "@/lib/supabase/admin";

export type ManagedUser = {
  id: string;
  email: string;
  username: string | null;
  access: "owner" | "admin" | "none";
  createdAt: string;
  lastSignInAt: string | null;
  orderCount: number;
  isYou: boolean;
};

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.");
const usernameSchema = z
  .string()
  .trim()
  .max(40, "Keep the name under 40 characters.")
  .optional()
  .transform((v) => (v ? v : null));
const passwordSchema = z.string().min(8, "Passwords need at least 8 characters.").max(72);
const accessSchema = z.enum(["admin", "none"]);

const createSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  access: accessSchema,
});

const updateSchema = z.object({
  id: z.string().uuid(),
  email: emailSchema,
  username: usernameSchema,
  password: z.union([passwordSchema, z.literal("")]).optional(),
  access: accessSchema,
});

function fail(e: unknown): { ok: false; error: string } {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Check the form." };
  if (e instanceof Error && (e.message === "FORBIDDEN" || e.message === "UNAUTHORIZED")) {
    return { ok: false, error: "Only the account owner can manage users." };
  }
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
}

function friendlyAuthError(message: string) {
  if (/already.*(registered|exists)/i.test(message)) return "A user with that email already exists.";
  if (/password/i.test(message)) return message;
  return message || "Supabase rejected the change.";
}

export async function listUsersAction(): Promise<Result<ManagedUser[]>> {
  try {
    const me = await requireAccountOwner();
    const admin = createAdminClient();

    const { data: authData, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw new Error(error.message);

    const [{ data: profiles }, { data: orders }] = await Promise.all([
      admin.from("profiles").select("id, username, role"),
      admin.from("orders").select("user_id"),
    ]);
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const ordersByUser = new Map<string, number>();
    for (const o of orders ?? []) ordersByUser.set(o.user_id, (ordersByUser.get(o.user_id) ?? 0) + 1);

    const users: ManagedUser[] = authData.users.map((u) => {
      const profile = profileById.get(u.id);
      const email = u.email ?? "";
      return {
        id: u.id,
        email,
        username: profile?.username ?? null,
        access: isOwnerEmail(email) ? "owner" : profile?.role === "admin" ? "admin" : "none",
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        orderCount: ordersByUser.get(u.id) ?? 0,
        isYou: u.id === me.id,
      };
    });

    const rank = { owner: 0, admin: 1, none: 2 } as const;
    users.sort((a, b) => rank[a.access] - rank[b.access] || b.createdAt.localeCompare(a.createdAt));
    return { ok: true, data: users };
  } catch (e) {
    return fail(e);
  }
}

export async function createUserAction(input: z.input<typeof createSchema>): Promise<Result<{ id: string }>> {
  try {
    await requireAccountOwner();
    const data = createSchema.parse(input);
    const admin = createAdminClient();

    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: data.username ? { username: data.username } : {},
    });
    if (error || !created.user) return { ok: false, error: friendlyAuthError(error?.message ?? "") };

    // The signup trigger normally creates the profile; upsert in case it didn't.
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: created.user.id,
        email: data.email,
        username: data.username ?? data.email.split("@")[0],
        role: data.access === "admin" ? "admin" : "customer",
        created_at: created.user.created_at,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (profileError) {
      if (profileError.code === "23505") {
        await admin.auth.admin.deleteUser(created.user.id);
        return { ok: false, error: "That display name is taken. Pick another one." };
      }
      return { ok: false, error: `User created, but saving the profile failed: ${profileError.message}` };
    }

    revalidatePath("/users");
    return { ok: true, data: { id: created.user.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function updateUserAction(input: z.input<typeof updateSchema>): Promise<Result> {
  try {
    const me = await requireAccountOwner();
    const data = updateSchema.parse(input);
    const admin = createAdminClient();

    const { data: existing, error: getError } = await admin.auth.admin.getUserById(data.id);
    if (getError || !existing.user) return { ok: false, error: "That user no longer exists." };

    const wasOwner = isOwnerEmail(existing.user.email);
    if (wasOwner && data.email !== existing.user.email?.toLowerCase()) {
      return { ok: false, error: "The owner's email is set in .env.local (OWNER_EMAIL); change it there." };
    }
    if (data.id === me.id && data.access === "none" && !wasOwner) {
      return { ok: false, error: "You can't remove your own access." };
    }

    const authPatch: { email?: string; password?: string; email_confirm?: boolean } = {};
    if (data.email !== existing.user.email?.toLowerCase()) {
      authPatch.email = data.email;
      authPatch.email_confirm = true;
    }
    if (data.password) authPatch.password = data.password;
    if (Object.keys(authPatch).length) {
      const { error } = await admin.auth.admin.updateUserById(data.id, authPatch);
      if (error) return { ok: false, error: friendlyAuthError(error.message) };
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        email: data.email,
        username: data.username,
        // The owner always has access via OWNER_EMAIL; keep their row as admin.
        role: wasOwner || data.access === "admin" ? "admin" : "customer",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (profileError) {
      return {
        ok: false,
        error: profileError.code === "23505" ? "That display name is taken." : profileError.message,
      };
    }

    revalidatePath("/users");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteUserAction(id: string): Promise<Result> {
  try {
    const me = await requireAccountOwner();
    if (id === me.id) return { ok: false, error: "You can't delete your own account." };
    const admin = createAdminClient();

    const { data: existing } = await admin.auth.admin.getUserById(id);
    if (!existing?.user) return { ok: false, error: "That user no longer exists." };
    if (isOwnerEmail(existing.user.email)) {
      return { ok: false, error: "Owner accounts can't be deleted. Remove them from OWNER_EMAIL first." };
    }

    // Orders are kept as history and point at the user, so those users can't be removed.
    const { count } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", id);
    if (count) {
      return {
        ok: false,
        error: `This user has ${count} order${count === 1 ? "" : "s"} on record. Set their access to "No access" instead to keep the history.`,
      };
    }

    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return { ok: false, error: error.message };

    revalidatePath("/users");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}
