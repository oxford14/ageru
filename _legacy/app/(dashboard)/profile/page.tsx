import { requireUser } from "@/lib/auth/require-user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <div className="space-y-4 max-w-lg">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Email:</span> {user.email}
          </p>
          <p>
            <span className="text-muted-foreground">Username:</span>{" "}
            {user.profile.username ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Role:</span> {user.profile.role}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
