import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { isOwnerEmail, ownerEmails } from "@/lib/auth/owner";
import { requireUser, type SessionUser } from "@/lib/auth/require-user";
import { ACTIVE_STATUSES } from "@/lib/services/sync-orders.service";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app/app-shell";
import { LogoMark } from "@/components/app/logo-mark";
import { Button } from "@/components/ui/button";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let user: SessionUser;
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  if (!isOwnerEmail(user.email)) {
    return <NotAllowed email={user.email} configured={ownerEmails().length > 0} />;
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ACTIVE_STATUSES);

  return (
    <AppShell email={user.email} activeCount={count ?? 0}>
      {children}
    </AppShell>
  );
}

function NotAllowed({ email, configured }: { email: string; configured: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <LogoMark className="size-8" />
        <h1 className="mt-6 text-xl font-semibold tracking-[-0.02em]">This panel is private</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          You&apos;re signed in as <span className="font-medium text-foreground">{email}</span>, which
          isn&apos;t the owner account. Orders here spend the real panel balance, so access is limited to
          the owner.
        </p>
        <div className="mt-4 rounded-lg border bg-card p-4 text-sm leading-relaxed">
          {configured
            ? "If this is you, add this email to OWNER_EMAIL in .env.local and restart the server."
            : "Set OWNER_EMAIL in .env.local to your email address and restart the server."}
          <code className="mt-2 block rounded bg-muted px-2 py-1.5 font-mono text-xs">
            OWNER_EMAIL={email}
          </code>
        </div>
        <form action={signOut} className="mt-6">
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
