"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteComboPlanAction,
  saveComboPlanAction,
} from "@/app/actions/combo-plans";
import type { ComboPlanWithItems } from "@/lib/combo/plans";
import {
  PLATFORMS,
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

type SlotDraft = {
  label: string;
  linkLabel: string;
  linkPlaceholder: string;
  defaultQuantity: string;
  categoryHint: string;
  serviceId: string;
};

const emptySlot = (): SlotDraft => ({
  label: "Line item",
  linkLabel: "Link",
  linkPlaceholder: "https://…",
  defaultQuantity: "",
  categoryHint: "",
  serviceId: "",
});

function planToDraft(plan: ComboPlanWithItems) {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    platform: plan.platform ?? "",
    active: plan.active,
    sortOrder: String(plan.sort_order),
    items: plan.items.length
      ? plan.items
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((i) => ({
            label: i.label,
            linkLabel: i.link_label,
            linkPlaceholder: i.link_placeholder,
            defaultQuantity: i.default_quantity != null ? String(i.default_quantity) : "",
            categoryHint: i.category_hint ?? "",
            serviceId: i.service_id ?? "",
          }))
      : [emptySlot()],
  };
}

export function ComboPlansEditor({
  initialPlans,
  services,
}: {
  initialPlans: ComboPlanWithItems[];
  services: PanelService[];
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => ({
    name: "",
    description: "",
    platform: "facebook",
    active: true,
    sortOrder: "0",
    items: [emptySlot(), emptySlot(), emptySlot()] as SlotDraft[],
  }));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  function openNew() {
    setEditingId(null);
    setDraft({
      name: "",
      description: "",
      platform: "facebook",
      active: true,
      sortOrder: String(plans.length),
      items: [emptySlot(), emptySlot(), emptySlot()],
    });
    setOpen(true);
  }

  function openEdit(plan: ComboPlanWithItems) {
    setEditingId(plan.id);
    const d = planToDraft(plan);
    setDraft({
      name: d.name,
      description: d.description,
      platform: d.platform || "facebook",
      active: d.active,
      sortOrder: String(d.sortOrder),
      items: d.items,
    });
    setOpen(true);
  }

  function save() {
    startTransition(async () => {
      const res = await saveComboPlanAction({
        id: editingId ?? undefined,
        name: draft.name.trim(),
        description: draft.description.trim(),
        platform: draft.platform || null,
        active: draft.active,
        sortOrder: Number(draft.sortOrder) || 0,
        items: draft.items.map((item) => ({
          label: item.label.trim(),
          linkLabel: item.linkLabel.trim(),
          linkPlaceholder: item.linkPlaceholder.trim(),
          defaultQuantity: item.defaultQuantity ? Number(item.defaultQuantity) : null,
          categoryHint: item.categoryHint.trim() || null,
          serviceId: item.serviceId.trim() || null,
        })),
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(editingId ? "Combo plan updated" : "Combo plan created");
      setOpen(false);
      window.location.reload();
    });
  }

  function remove(planId: string) {
    if (!confirm("Delete this combo plan?")) return;
    startTransition(async () => {
      const res = await deleteComboPlanAction(planId);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success("Deleted");
        setPlans((p) => p.filter((x) => x.id !== planId));
      }
    });
  }

  return (
    <div className="space-y-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] text-muted-foreground">
          Bundle multiple panel services into one modal (e.g. page followers + post reactions).
        </p>
        <Button type="button" size="sm" onClick={openNew}>
          <Plus className="mr-1 size-4" />
          Add plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">No combo plans yet.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {plans.map((plan) => (
            <li key={plan.id} className="flex items-start justify-between gap-3 px-3 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{plan.name}</p>
                <p className="text-muted-foreground text-[13px]">
                  {plan.items.length} lines
                  {plan.platform ? ` · ${platformLabel(plan.platform)}` : ""}
                  {!plan.active ? " · inactive" : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" size="icon" variant="ghost" onClick={() => openEdit(plan)}>
                  <Pencil className="size-4" />
                </Button>
                <Button type="button" size="icon" variant="ghost" onClick={() => remove(plan.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit combo plan" : "New combo plan"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="FB Combo"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Description</Label>
              <Input
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder="Page boost + post engagement"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Platform filter</Label>
                <select
                  className="h-9 rounded-md border px-2 text-sm"
                  value={draft.platform}
                  onChange={(e) => setDraft((d) => ({ ...d, platform: e.target.value }))}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={draft.sortOrder}
                  onChange={(e) => setDraft((d) => ({ ...d, sortOrder: e.target.value }))}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft((d) => ({ ...d, active: e.target.checked }))}
              />
              Active on Combos page
            </label>

            <div className="space-y-4 border-t pt-3">
              <p className="text-sm font-medium">Lines</p>
              {draft.items.map((item, idx) => (
                <div key={idx} className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between sm:col-span-2">
                    <span className="text-xs font-medium text-muted-foreground">Line {idx + 1}</span>
                    {draft.items.length > 1 ? (
                      <button
                        type="button"
                        className="text-xs text-destructive"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            items: d.items.filter((_, i) => i !== idx),
                          }))
                        }
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <Input
                    className="sm:col-span-2"
                    placeholder="Label (e.g. Page followers)"
                    value={item.label}
                    onChange={(e) =>
                      setDraft((d) => {
                        const items = [...d.items];
                        items[idx] = { ...items[idx], label: e.target.value };
                        return { ...d, items };
                      })
                    }
                  />
                  <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                    <Input
                      placeholder="Link field label"
                      value={item.linkLabel}
                      onChange={(e) =>
                        setDraft((d) => {
                          const items = [...d.items];
                          items[idx] = { ...items[idx], linkLabel: e.target.value };
                          return { ...d, items };
                        })
                      }
                    />
                    <Input
                      placeholder="Default qty"
                      type="number"
                      value={item.defaultQuantity}
                      onChange={(e) =>
                        setDraft((d) => {
                          const items = [...d.items];
                          items[idx] = { ...items[idx], defaultQuantity: e.target.value };
                          return { ...d, items };
                        })
                      }
                    />
                  </div>
                  <Input
                    className="sm:col-span-2"
                    placeholder="Link placeholder"
                    value={item.linkPlaceholder}
                    onChange={(e) =>
                      setDraft((d) => {
                        const items = [...d.items];
                        items[idx] = { ...items[idx], linkPlaceholder: e.target.value };
                        return { ...d, items };
                      })
                    }
                  />
                  <Input
                    placeholder="Category hint (optional filter text)"
                    value={item.categoryHint}
                    onChange={(e) =>
                      setDraft((d) => {
                        const items = [...d.items];
                        items[idx] = { ...items[idx], categoryHint: e.target.value };
                        return { ...d, items };
                      })
                    }
                  />
                  <select
                    className="h-9 w-full rounded-md border px-2 text-sm sm:col-span-2"
                    value={item.serviceId}
                    onChange={(e) =>
                      setDraft((d) => {
                        const items = [...d.items];
                        items[idx] = { ...items[idx], serviceId: e.target.value };
                        return { ...d, items };
                      })
                    }
                  >
                    <option value="">Pick service at order time</option>
                    {services
                      .filter((s) => !draft.platform || s.platform === draft.platform)
                      .slice(0, 500)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id} · {s.name.slice(0, 60)}
                        </option>
                      ))}
                  </select>
                  {item.serviceId && serviceById.get(item.serviceId) ? (
                    <p className="text-xs text-muted-foreground sm:col-span-2">
                      Pinned: {serviceById.get(item.serviceId)!.name}
                    </p>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDraft((d) => ({ ...d, items: [...d.items, emptySlot()] }))}
              >
                Add line
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={pending || !draft.name.trim()} onClick={save}>
              Save plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
