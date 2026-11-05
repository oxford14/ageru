import { requireSuperAdmin, isSuperAdmin } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/require-user";

/**
 * Orders spend the real SMM panel balance, so access is limited to super admins
 * (owner email + delegated staff). Resellers use the separate reseller app.
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

export function canUsePanel(user: Parameters<typeof isSuperAdmin>[0]) {
  return isSuperAdmin(user);
}

/** Super Admin panel access (legacy name kept for imports). */
export async function requireOwner() {
  return requireSuperAdmin();
}

/** Only the account owner, e.g. for managing users. */
export async function requireAccountOwner() {
  const user = await requireUser();
  if (!isOwnerEmail(user.email)) throw new Error("FORBIDDEN");
  return user;
}
