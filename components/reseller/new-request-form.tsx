"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createResellerRequestAction } from "@/app/actions/reseller-requests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewRequestForm({
  serviceId,
  serviceName,
  minQuantity,
  maxQuantity,
}: {
  serviceId: string;
  serviceName: string;
  minQuantity: number;
  maxQuantity: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4 rounded-xl border bg-card p-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          try {
            const result = await createResellerRequestAction({
              serviceId,
              quantity: Number(fd.get("quantity")),
              targetUrl: String(fd.get("targetUrl") ?? ""),
            });
            router.push(`/reseller/requests?created=${result.id}`);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not create request");
          }
        });
      }}
    >
      <p className="text-sm text-muted-foreground">
        Service: <span className="font-medium text-foreground">{serviceName}</span>
      </p>
      <div className="space-y-2">
        <Label htmlFor="targetUrl">Target URL</Label>
        <Input id="targetUrl" name="targetUrl" required placeholder="https://..." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          required
          min={minQuantity}
          max={maxQuantity}
          defaultValue={minQuantity}
        />
        <p className="text-xs text-muted-foreground">
          Between {minQuantity.toLocaleString()} and {maxQuantity.toLocaleString()}
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Submitting…" : "Submit request"}
      </Button>
    </form>
  );
}
