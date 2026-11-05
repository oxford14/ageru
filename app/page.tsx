import { redirect } from "next/navigation";
import { homePathForRole } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/require-user";

export default async function HomePage() {
  try {
    const user = await requireUser();
    redirect(homePathForRole(user.profile.role, user.email));
  } catch {
    redirect("/login");
  }
}
