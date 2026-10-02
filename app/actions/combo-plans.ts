"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/auth/owner";
import { fetchComboPlans } from "@/lib/combo/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  saveComboPlanSchema,
  type SaveComboPlanPayload,
} from "@/lib/validators/combo-orders";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  if (e instanceof Error && (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")) {
    return { ok: false, error: "You're not allowed to do that." };
  }
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
}

export async function listComboPlansAction(): Promise<
  Result<Awaited<ReturnType<typeof fetchComboPlans>>>
> {
  try {
    await requireOwner();
    const plans = await fetchComboPlans();
    return { ok: true, data: plans };
  } catch (e) {
    return fail(e);
  }
}

export async function saveComboPlanAction(payload: SaveComboPlanPayload): Promise<Result<{ id: string }>> {
  try {
    await requireOwner();
    const parsed = saveComboPlanSchema.parse(payload);
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const planPatch = {
      name: parsed.name,
      description: parsed.description ?? "",
      platform: parsed.platform ?? null,
      active: parsed.active,
      sort_order: parsed.sortOrder,
      updated_at: now,
    };

    let planId = parsed.id;

    if (planId) {
      const { error } = await supabase.from("combo_plans").update(planPatch).eq("id", planId);
      if (error) throw error;
      await supabase.from("combo_plan_items").delete().eq("plan_id", planId);
    } else {
      const { data, error } = await supabase
        .from("combo_plans")
        .insert(planPatch)
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("Insert failed");
      planId = data.id;
    }

    const itemRows = parsed.items.map((item, index) => ({
      plan_id: planId!,
      sort_order: index,
      label: item.label,
      link_label: item.linkLabel,
      link_placeholder: item.linkPlaceholder ?? "",
      default_quantity: item.defaultQuantity ?? null,
      category_hint: item.categoryHint ?? null,
      service_id: item.serviceId?.trim() || null,
    }));

    const { error: itemsError } = await supabase.from("combo_plan_items").insert(itemRows);
    if (itemsError) throw itemsError;

    revalidatePath("/settings");
    revalidatePath("/combos");
    return { ok: true, data: { id: planId! } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteComboPlanAction(planId: string): Promise<Result> {
  try {
    await requireOwner();
    const supabase = createAdminClient();
    const { error } = await supabase.from("combo_plans").delete().eq("id", planId);
    if (error) throw error;
    revalidatePath("/settings");
    revalidatePath("/combos");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}
