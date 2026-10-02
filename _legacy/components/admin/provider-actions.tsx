"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ProviderActions({ providerId }: { providerId: string }) {
  async function testConnection() {
    const res = await fetch(`/api/admin/providers/${providerId}/test`, { method: "POST" });
    const json = await res.json();
    if (json.success) toast.success(`Balance: ${json.data.balance.balance}`);
    else toast.error(json.error ?? "Test failed");
  }

  async function syncProvider() {
    const res = await fetch(`/api/admin/providers/${providerId}/sync`, { method: "POST" });
    const json = await res.json();
    if (json.success) toast.success(`Synced ${json.data.serviceCount} services`);
    else toast.error(json.error ?? "Sync failed");
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={testConnection}>
        Test
      </Button>
      <Button size="sm" variant="outline" onClick={syncProvider}>
        Sync
      </Button>
    </div>
  );
}
