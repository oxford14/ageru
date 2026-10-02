import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const supabase = createAdminClient();
  const { data: settings } = await supabase.from("app_settings").select("*");

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Application settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(settings ?? []).map((s) => (
            <div key={s.key} className="flex justify-between border-b pb-2">
              <span className="font-mono">{s.key}</span>
              <span className="text-muted-foreground">{JSON.stringify(s.value)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
