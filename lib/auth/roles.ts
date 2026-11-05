import { requireUser, type SessionUser } from "@/lib/auth/require-user";
import { isOwnerEmail } from "@/lib/auth/owner";
import type { UserRole } from "@/lib/supabase/database.types";

export function isSuperAdminRole(role: UserRole, email?: string | null) {
  if (role === "super_admin" || role === "admin") return true;
  return isOwnerEmail(email);
}

export function isResellerRole(role: UserRole) {
  return role === "reseller" || role === "customer";
}

export function isSuperAdmin(user: Pick<SessionUser, "email" | "profile">) {
  return isSuperAdminRole(user.profile.role, user.email);
}

export function isReseller(user: Pick<SessionUser, "profile">) {
  return isResellerRole(user.profile.role);
}

export function homePathForRole(role: UserRole, email?: string | null) {
  if (isSuperAdminRole(role, email)) return "/dashboard";
  if (isResellerRole(role)) return "/reseller/dashboard";
  return "/login";
}

export async function requireSuperAdmin() {
  const user = await requireUser();
  if (!isSuperAdmin(user)) throw new Error("FORBIDDEN");
  return user;
}

export async function requireReseller() {
  const user = await requireUser();
  if (!isReseller(user)) throw new Error("FORBIDDEN");
  return user;
}
