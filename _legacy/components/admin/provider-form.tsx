"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProviderForm() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          type: form.get("type"),
          api_url: form.get("api_url") || null,
          api_key: form.get("api_key") || undefined,
          enabled: form.get("enabled") === "on",
          markup_percentage: Number(form.get("markup_percentage") ?? 50),
        }),
      });
      const json = await res.json();
      if (!json.success) toast.error(json.error);
      else {
        toast.success("Provider created");
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 max-w-lg border rounded-lg p-4">
      <div>
        <Label>Name</Label>
        <Input name="name" required />
      </div>
      <div>
        <Label>Type</Label>
        <select name="type" className="w-full border rounded-md h-9 px-2 text-sm">
          <option value="smm_v2">SMM v2 API</option>
          <option value="manual">Manual / Test</option>
        </select>
      </div>
      <div>
        <Label>API URL</Label>
        <Input name="api_url" placeholder="https://provider.example/api/v2" />
      </div>
      <div>
        <Label>API Key</Label>
        <Input name="api_key" type="password" />
      </div>
      <div>
        <Label>Markup %</Label>
        <Input name="markup_percentage" type="number" defaultValue={50} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" /> Enabled
      </label>
      <Button type="submit" disabled={loading}>
        Save provider
      </Button>
    </form>
  );
}
