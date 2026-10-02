"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import type { ComboPlanWithItems } from "@/lib/combo/plans";
import { platformLabel, type PanelService } from "@/lib/panel/shared";
import { ComboOrderDialog } from "@/components/combos/combo-order-dialog";
import { cn } from "@/lib/utils";

export function ComboPlansGrid({
  plans,
  services,
  currency,
  balance,
}: {
  plans: ComboPlanWithItems[];
  services: PanelService[];
  currency: string;
  balance: number | null;
}) {
  const [selected, setSelected] = useState<ComboPlanWithItems | null>(null);
  const [open, setOpen] = useState(false);

  function openPlan(plan: ComboPlanWithItems) {
    setSelected(plan);
    setOpen(true);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => openPlan(plan)}
            className={cn(
              "flex flex-col rounded-xl border bg-card p-5 text-left shadow-sm transition-colors",
              "hover:border-primary/40 hover:bg-muted/30"
            )}
          >
            <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="size-5" />
            </div>
            <h2 className="font-semibold">{plan.name}</h2>
            {plan.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>
            ) : null}
            <p className="mt-3 text-xs text-muted-foreground">
              {plan.items.length} lines
              {plan.platform ? ` · ${platformLabel(plan.platform)}` : ""}
            </p>
            <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {[...plan.items]
                .sort((a, b) => a.sort_order - b.sort_order)
                .slice(0, 4)
                .map((item) => (
                  <li key={item.id} className="truncate">
                    · {item.label}
                  </li>
                ))}
            </ul>
          </button>
        ))}
      </div>

      <ComboOrderDialog
        plan={selected}
        services={services}
        currency={currency}
        balance={balance}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
