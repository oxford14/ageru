import { createAdminClient } from "@/lib/supabase/admin";
import type { ComboPlanItemRow, ComboPlanRow } from "@/lib/supabase/database.types";

export type ComboPlanWithItems = ComboPlanRow & { items: ComboPlanItemRow[] };

export async function fetchComboPlans(opts?: { activeOnly?: boolean }) {
  const supabase = createAdminClient();
  let query = supabase.from("combo_plans").select("*").order("sort_order").order("name");
  if (opts?.activeOnly) query = query.eq("active", true);
  const { data: plans, error } = await query;
  if (error) throw error;
  if (!plans?.length) return [] as ComboPlanWithItems[];

  const { data: items, error: itemsError } = await supabase
    .from("combo_plan_items")
    .select("*")
    .in(
      "plan_id",
      plans.map((p) => p.id)
    )
    .order("sort_order");
  if (itemsError) throw itemsError;

  const byPlan = new Map<string, ComboPlanItemRow[]>();
  for (const item of items ?? []) {
    const list = byPlan.get(item.plan_id) ?? [];
    list.push(item);
    byPlan.set(item.plan_id, list);
  }

  return plans.map((plan) => ({
    ...plan,
    items: byPlan.get(plan.id) ?? [],
  }));
}

export async function fetchComboPlanById(planId: string) {
  const plans = await fetchComboPlans();
  return plans.find((p) => p.id === planId) ?? null;
}
