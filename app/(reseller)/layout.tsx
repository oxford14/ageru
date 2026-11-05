import { redirect } from "next/navigation";
import { homePathForRole, isSuperAdmin } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { ResellerShell } from "@/components/reseller/reseller-shell";

export default async function ResellerLayout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  if (isSuperAdmin(user)) {
    redirect("/dashboard");
  }

  if (user.profile.role !== "reseller" && user.profile.role !== "customer") {
    redirect(homePathForRole(user.profile.role, user.email));
  }

  const supabase = await createClient();
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <ResellerShell email={user.email} balancePhp={wallet?.balance ?? "0"}>
      <div className="mx-auto max-w-5xl p-6 md:p-8">{children}</div>
    </ResellerShell>
  );
}
