import { requireReseller } from "@/lib/auth/roles";

export default async function ResellerProfilePage() {
  const user = await requireReseller();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your reseller account details.</p>
      </div>
      <dl className="divide-y rounded-xl border bg-card text-sm">
        <div className="grid grid-cols-3 gap-2 px-4 py-3">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="col-span-2 font-medium">{user.email}</dd>
        </div>
        <div className="grid grid-cols-3 gap-2 px-4 py-3">
          <dt className="text-muted-foreground">Display name</dt>
          <dd className="col-span-2 font-medium">{user.profile.username ?? "—"}</dd>
        </div>
        <div className="grid grid-cols-3 gap-2 px-4 py-3">
          <dt className="text-muted-foreground">Role</dt>
          <dd className="col-span-2 font-medium capitalize">{user.profile.role}</dd>
        </div>
      </dl>
    </div>
  );
}
