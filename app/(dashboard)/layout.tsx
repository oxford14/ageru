import { redirect } from "next/navigation";
import { isOwnerEmail } from "@/lib/auth/owner";
import { isSuperAdmin, homePathForRole } from "@/lib/auth/roles";
import { requireUser, type SessionUser } from "@/lib/auth/require-user";
import { ACTIVE_STATUSES } from "@/lib/services/sync-orders.service";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user: SessionUser;
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  if (!isSuperAdmin(user)) {
    redirect(homePathForRole(user.profile.role, user.email));
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ACTIVE_STATUSES);

  return (
    <AppShell email={user.email} activeCount={count ?? 0} isAccountOwner={isOwnerEmail(user.email)}>
      {children}
    </AppShell>
  );
}

