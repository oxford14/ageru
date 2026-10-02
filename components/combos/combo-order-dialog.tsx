"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { placeComboOrderAction } from "@/app/actions/orders";
import type { ComboPlanWithItems } from "@/lib/combo/plans";
import {
  commentLines,
  estimateCost,
  fieldsForType,
  formatCurrency,
  formatNumber,
  platformLabel,
  type PanelService,
} from "@/lib/panel/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/15";

type SlotState = {
  slotId: string;
  label: string;
  linkLabel: string;
  linkPlaceholder: string;
  pinnedServiceId: string | null;
  categoryHint: string | null;
  serviceId: string;
  category: string;
  link: string;
  quantity: string;
  comments: string;
  username: string;
  answer: string;
  idempotencyKey: string;
};

function filterServices(
  services: PanelService[],
  platform: string | null,
  category: string,
  hint: string | null
) {
  let list = services;
  if (platform) list = list.filter((s) => s.platform === platform);
  if (category) list = list.filter((s) => s.category === category);
  if (hint?.trim()) {
    const h = hint.trim().toLowerCase();
    list = list.filter(
      (s) => s.category.toLowerCase().includes(h) || s.name.toLowerCase().includes(h)
    );
  }
  return list;
}

export function ComboOrderDialog({
  plan,
  services,
  currency,
  balance,
  open,
  onOpenChange,
}: {
  plan: ComboPlanWithItems | null;
  services: PanelService[];
  currency: string;
  balance: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [slots, setSlots] = useState<SlotState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const comboGroupId = useRef<string | null>(null);

  useEffect(() => {
    if (!plan || !open) return;
    comboGroupId.current = crypto.randomUUID();
    setSlots(
      [...plan.items]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({
          slotId: item.id,
          label: item.label,
          linkLabel: item.link_label,
          linkPlaceholder: item.link_placeholder,
          pinnedServiceId: item.service_id,
          categoryHint: item.category_hint,
          serviceId: item.service_id ?? "",
          category: "",
          link: "",
          quantity:
            item.default_quantity != null ? String(item.default_quantity) : "",
          comments: "",
          username: "",
          answer: "",
          idempotencyKey: crypto.randomUUID(),
        }))
    );
    setError(null);
  }, [plan, open]);

  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  const lineCosts = useMemo(() => {
    return slots.map((slot) => {
      const service = serviceById.get(slot.serviceId);
      if (!service) return 0;
      const fields = fieldsForType(service.type);
      if (!fields) return 0;
      const lines = commentLines(slot.comments);
      const qty = Number(slot.quantity);
      const units = fields.comments
        ? lines.length
        : fields.quantity
          ? qty
          : 1;
      if (units <= 0) return 0;
      return estimateCost(service, units);
    });
  }, [slots, serviceById]);

  const totalCost = lineCosts.reduce((a, b) => a + b, 0);
  const after = balance != null ? balance - totalCost : null;

  const categories = useMemo(() => {
    if (!plan) return [];
    const seen = new Map<string, number>();
    for (const s of services) {
      if (plan.platform && s.platform !== plan.platform) continue;
      seen.set(s.category, (seen.get(s.category) ?? 0) + 1);
    }
    return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [services, plan]);

  function updateSlot(index: number, patch: Partial<SlotState>) {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function validate(): string | null {
    if (!plan) return "No plan selected.";
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const service = serviceById.get(slot.serviceId);
      if (!service) return `Line ${i + 1}: pick a service.`;
      if (!slot.link.trim()) return `Line ${i + 1}: add a link.`;
      const fields = fieldsForType(service.type);
      if (!fields) return `Line ${i + 1}: service type not supported here.`;
      if (fields.quantity) {
        const q = Number(slot.quantity);
        if (!Number.isInteger(q) || q < service.min || q > service.max) {
          return `Line ${i + 1}: quantity must be ${formatNumber(service.min)}–${formatNumber(service.max)}.`;
        }
      }
      if (fields.comments) {
        const lines = commentLines(slot.comments);
        if (lines.length < service.min || lines.length > service.max) {
          return `Line ${i + 1}: enter ${formatNumber(service.min)}–${formatNumber(service.max)} comments.`;
        }
      }
      if (fields.username && !slot.username.trim()) {
        return `Line ${i + 1}: username required.`;
      }
      if (fields.answerNumber && !slot.answer.trim()) {
        return `Line ${i + 1}: poll answer required.`;
      }
    }
    if (after != null && after < 0) return "Not enough panel balance for this combo.";
    return null;
  }

  function submit() {
    if (!plan || !comboGroupId.current) return;
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await placeComboOrderAction({
        comboPlanId: plan.id,
        comboGroupId: comboGroupId.current!,
        lines: slots.map((slot) => {
          const service = serviceById.get(slot.serviceId)!;
          const fields = fieldsForType(service.type)!;
          const lines = commentLines(slot.comments);
          const qty = Number(slot.quantity);
          return {
            slotId: slot.slotId,
            serviceId: slot.serviceId,
            link: slot.link.trim(),
            quantity: fields.quantity ? qty : undefined,
            comments: fields.comments ? lines.join("\n") : undefined,
            username: fields.username ? slot.username.trim() : undefined,
            answerNumber: fields.answerNumber ? slot.answer.trim() : undefined,
            idempotencyKey: slot.idempotencyKey,
          };
        }),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.data.partial) {
        toast.warning(
          `${res.data.orders.length} placed, ${res.data.failures.length} failed. Check Orders.`
        );
      } else {
        toast.success(`Combo placed · ${res.data.orders.length} orders`);
      }
      onOpenChange(false);
      router.push(`/orders?combo=${res.data.comboGroupId}`);
      router.refresh();
    });
  }

  if (!plan) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{plan.name}</DialogTitle>
          {plan.description ? (
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          ) : null}
        </DialogHeader>

        <div className="space-y-6 py-2">
          {slots.map((slot, index) => {
            const service = slot.serviceId ? serviceById.get(slot.serviceId) : null;
            const fields = service ? fieldsForType(service.type) : null;
            const options = filterServices(
              services,
              plan.platform,
              slot.category,
              slot.pinnedServiceId ? null : slot.categoryHint
            );

            return (
              <section key={slot.slotId} className="space-y-3 rounded-lg border p-4">
                <h3 className="text-sm font-semibold">{slot.label}</h3>

                {slot.pinnedServiceId && service ? (
                  <p className="text-[13px] text-muted-foreground">{service.name}</p>
                ) : (
                  <>
                    <div className="grid gap-1.5">
                      <Label>Category</Label>
                      <select
                        className={fieldClass}
                        value={slot.category}
                        onChange={(e) =>
                          updateSlot(index, { category: e.target.value, serviceId: "" })
                        }
                      >
                        <option value="">Choose category…</option>
                        {categories.map(([cat, n]) => (
                          <option key={cat} value={cat}>
                            {cat} ({n})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Service</Label>
                      <select
                        className={fieldClass}
                        value={slot.serviceId}
                        disabled={!slot.category && !slot.categoryHint && !slot.pinnedServiceId}
                        onChange={(e) => updateSlot(index, { serviceId: e.target.value })}
                      >
                        <option value="">Choose service…</option>
                        {options
                          .filter((s) => !slot.category || s.category === slot.category)
                          .slice(0, 200)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name.slice(0, 80)} · {formatCurrency(s.rate, currency)}/1k
                            </option>
                          ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="grid gap-1.5">
                  <Label>{slot.linkLabel}</Label>
                  <Input
                    className={fieldClass}
                    placeholder={slot.linkPlaceholder || "https://…"}
                    value={slot.link}
                    onChange={(e) => updateSlot(index, { link: e.target.value })}
                  />
                </div>

                {fields?.quantity ? (
                  <div className="grid gap-1.5">
                    <Label>Quantity</Label>
                    <Input
                      className={fieldClass}
                      type="number"
                      value={slot.quantity}
                      onChange={(e) => updateSlot(index, { quantity: e.target.value })}
                    />
                  </div>
                ) : null}

                {fields?.comments ? (
                  <div className="grid gap-1.5">
                    <Label>Comments (one per line)</Label>
                    <textarea
                      className={cn(fieldClass, "min-h-[88px] py-2")}
                      value={slot.comments}
                      onChange={(e) => updateSlot(index, { comments: e.target.value })}
                    />
                  </div>
                ) : null}

                {fields?.username ? (
                  <div className="grid gap-1.5">
                    <Label>Username</Label>
                    <Input
                      className={fieldClass}
                      value={slot.username}
                      onChange={(e) => updateSlot(index, { username: e.target.value })}
                    />
                  </div>
                ) : null}

                {fields?.answerNumber ? (
                  <div className="grid gap-1.5">
                    <Label>Poll answer #</Label>
                    <Input
                      className={fieldClass}
                      value={slot.answer}
                      onChange={(e) => updateSlot(index, { answer: e.target.value })}
                    />
                  </div>
                ) : null}

                {lineCosts[index] > 0 ? (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Est. {formatCurrency(lineCosts[index], currency)}
                  </p>
                ) : null}
              </section>
            );
          })}
        </div>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
          <div className="flex justify-between text-sm tabular-nums">
            <span className="text-muted-foreground">Total estimate</span>
            <span className="font-medium">{formatCurrency(totalCost, currency)}</span>
          </div>
          {after != null ? (
            <p className="text-xs text-muted-foreground text-right tabular-nums">
              Balance after {formatCurrency(after, currency)}
            </p>
          ) : null}
          <Button type="button" disabled={pending} onClick={submit} className="w-full">
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Placing combo…
              </>
            ) : (
              `Place combo · ${formatCurrency(totalCost, currency)}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
