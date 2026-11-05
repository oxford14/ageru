"use client";

import { useTransition } from "react";
import {
  upsertProviderOfferAction,
  upsertResellerServiceAction,
} from "@/app/actions/reseller-admin";
import type {
  ProviderServiceOfferRow,
  ResellerServicePriceRow,
  ResellerServiceRow,
} from "@/lib/supabase/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResellerPricingForms({
  services,
  prices,
  providers,
  offers,
}: {
  services: ResellerServiceRow[];
  prices: ResellerServicePriceRow[];
  providers: { id: string; name: string }[];
  offers: ProviderServiceOfferRow[];
}) {
  const priceByService = new Map(prices.map((p) => [p.service_id, p.price_per_unit]));
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="font-semibold">Reseller catalog</h2>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              await upsertResellerServiceAction({
                name: String(fd.get("name")),
                slug: String(fd.get("slug")),
                description: String(fd.get("description") ?? ""),
                unitLabel: String(fd.get("unitLabel") ?? "units"),
                minQuantity: Number(fd.get("minQuantity")),
                maxQuantity: Number(fd.get("maxQuantity")),
                pricePerThousand: String(fd.get("pricePerThousand")),
              });
            });
          }}
        >
          <div className="space-y-1">
            <Label>Name</Label>
            <Input name="name" required placeholder="Instagram followers" />
          </div>
          <div className="space-y-1">
            <Label>Slug</Label>
            <Input name="slug" required placeholder="ig-followers" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input name="description" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Min qty</Label>
              <Input name="minQuantity" type="number" defaultValue={100} required />
            </div>
            <div className="space-y-1">
              <Label>Max qty</Label>
              <Input name="maxQuantity" type="number" defaultValue={100000} required />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Price per 1k (PHP)</Label>
            <Input name="pricePerThousand" required placeholder="150.0000" />
          </div>
          <Button type="submit" disabled={pending} size="sm">
            Add / update service
          </Button>
        </form>
        <ul className="space-y-2 text-sm">
          {services.map((s) => (
            <li key={s.id} className="rounded-lg bg-muted/40 px-3 py-2">
              <span className="font-medium">{s.name}</span>
              <span className="text-muted-foreground">
                {" "}
                · ₱{priceByService.get(s.id) ?? "—"}/1k · {s.active ? "active" : "off"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4 rounded-xl border p-5">
        <h2 className="font-semibold">Provider offers</h2>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              await upsertProviderOfferAction({
                providerId: String(fd.get("providerId")),
                serviceId: String(fd.get("serviceId")),
                costPerThousand: String(fd.get("costPerThousand")),
              });
            });
          }}
        >
          <div className="space-y-1">
            <Label>Reseller service</Label>
            <select
              name="serviceId"
              required
              className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Provider</Label>
            <select
              name="providerId"
              required
              className="flex h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Cost per 1k (PHP)</Label>
            <Input name="costPerThousand" required placeholder="80.0000" />
          </div>
          <Button type="submit" disabled={pending} size="sm">
            Add offer
          </Button>
        </form>
        <ul className="space-y-2 text-sm">
          {offers.map((o) => (
            <li key={o.id} className="rounded-lg bg-muted/40 px-3 py-2 tabular-nums">
              Service {o.service_id?.slice(0, 8)}… · provider {o.provider_id.slice(0, 8)}… · ₱
              {o.cost_per_unit}/1k
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
