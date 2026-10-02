import { requireUser } from "./require-user";

export async function requireAdmin() {
  const session = await requireUser();
  if (session.profile.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return session;
}
