"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type PreviewService = {
  providerServiceId: string;
  name: string;
  rate: string;
  min: number;
  max: number;
};

export function ServiceImportForm({
  providers,
  platforms,
  categories,
}: {
  providers: { id: string; name: string }[];
  platforms: { id: string; name: string }[];
  categories: { id: string; platform_id: string; name: string }[];
}) {
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [platformId, setPlatformId] = useState(platforms[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [preview, setPreview] = useState<PreviewService[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const filteredCategories = categories.filter((c) => c.platform_id === platformId);

  async function loadPreview() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/sync`, { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Sync failed");
        return;
      }
      setPreview(json.data.preview ?? []);
    } catch {
      toast.error("Failed to load preview");
    } finally {
      setLoading(false);
    }
  }

  async function importSelected() {
    const serviceIds = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (!serviceIds.length || !categoryId) {
      toast.error("Select category and services");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/services/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, platformId, categoryId, serviceIds }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Import failed");
        return;
      }
      toast.success(`Imported ${json.data.imported} services`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Provider</Label>
          <Select value={providerId} onValueChange={(v) => v && setProviderId(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Platform</Label>
          <Select value={platformId} onValueChange={(v) => v && setPlatformId(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={(v) => v && setCategoryId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {filteredCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={loadPreview} disabled={loading}>
        Load provider services preview
      </Button>
      <div className="space-y-2 max-h-96 overflow-y-auto border rounded-md p-3">
        {preview.map((s) => (
          <label key={s.providerServiceId} className="flex items-start gap-2 text-sm border-b pb-2">
            <Checkbox
              checked={!!selected[s.providerServiceId]}
              onCheckedChange={(v) =>
                setSelected((prev) => ({ ...prev, [s.providerServiceId]: !!v }))
              }
            />
            <span>
              <span className="font-medium">{s.name}</span>
              <span className="text-muted-foreground block">
                ID {s.providerServiceId} · {s.rate}/1k · {s.min}-{s.max}
              </span>
            </span>
          </label>
        ))}
      </div>
      <Button onClick={importSelected} disabled={loading}>
        Import selected
      </Button>
    </div>
  );
}
