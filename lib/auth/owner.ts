import { requireUser } from "@/lib/auth/require-user";

/**
 * Orders spend the real SMM panel balance, so only the owner may use the app.
 * OWNER_EMAIL accepts a comma-separated list; BOOTSTRAP_ADMIN_EMAIL is the
 * fallback for existing setups.
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

export async function requireOwner() {
  const user = await requireUser();
  if (!isOwnerEmail(user.email)) throw new Error("FORBIDDEN");
  return user;
}
