import { requireUser, type SessionUser } from "@/lib/auth/require-user";

/**
 * Orders spend the real SMM panel balance, so access is limited:
 * - the account owner(s): OWNER_EMAIL (comma-separated), falling back to
 *   BOOTSTRAP_ADMIN_EMAIL for existing setups. Only owners manage users.
 * - users the owner gave access to: profiles with role "admin".
 */
export function ownerEmails() {
  const raw = process.env.OWNER_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL || "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerEmail(email: string | null | undefined) {
  if (!email) return false;
  return ownerEmails().includes(email.trim().toLowerCase());
}

export function canUsePanel(user: Pick<SessionUser, "email" | "profile">) {
  return isOwnerEmail(user.email) || user.profile.role === "admin";
}

/** Anyone allowed to use the panel (owner or a user with access). */
export async function requireOwner() {
  const user = await requireUser();
  if (!canUsePanel(user)) throw new Error("FORBIDDEN");
  return user;
}

/** Only the account owner, e.g. for managing users. */
export async function requireAccountOwner() {
  const user = await requireUser();
  if (!isOwnerEmail(user.email)) throw new Error("FORBIDDEN");
  return user;
}
