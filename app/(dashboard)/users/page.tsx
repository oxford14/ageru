import { redirect } from "next/navigation";
import { listUsersAction } from "@/app/actions/users";
import { requireAccountOwner } from "@/lib/auth/owner";
import { PageHeader } from "@/components/app/page-header";
import { UsersManager } from "@/components/users/users-manager";

export default async function UsersPage() {
  try {
    await requireAccountOwner();
  } catch {
    redirect("/dashboard");
  }
  const result = await listUsersAction();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Who can sign in and place orders with your panel balance."
      />
      {result.ok ? (
        <UsersManager users={result.data} />
      ) : (
        <p className="rounded-lg border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}
