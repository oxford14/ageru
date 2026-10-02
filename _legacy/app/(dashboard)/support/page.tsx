import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { createSupportTicket } from "@/app/actions/support";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SupportPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Support</h1>
      <Card>
        <CardHeader>
          <CardTitle>New ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createSupportTicket} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" name="subject" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" name="message" required rows={4} />
            </div>
            <Button type="submit">Submit ticket</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Your tickets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(tickets ?? []).map((t) => (
            <div key={t.id} className="border rounded-md p-3 text-sm">
              <p className="font-medium">{t.subject}</p>
              <p className="text-muted-foreground capitalize">{t.status}</p>
            </div>
          ))}
          {!tickets?.length && (
            <p className="text-muted-foreground text-sm">No tickets yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
