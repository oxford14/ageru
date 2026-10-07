"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/owner";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CustomerRow, OrderStatus } from "@/lib/supabase/database.types";

const ACTIVE: OrderStatus[] = ["pending", "processing", "in_progress"];

export type CustomerListItem = CustomerRow & {
  orderCount: number;
  lastOrderAt: string | null;
  /** Panel spend on orders that actually went through. */
  spent: number;
  activeCount: number;
  currency: string;
};

export type CustomerOrderItem = {
  id: string;
  providerOrderId: string | null;
  serviceId: string | null;
  serviceName: string | null;
  link: string;
  quantity: number;
  remains: number | null;
  status: OrderStatus;
  charge: string;
  currency: string;
  createdAt: string;
};

export type CustomerLinkHistoryItem = {
  targetUrl: string;
  orderCount: number;
  lastBoostedAt: string;
  lastServiceName: string | null;
  lastStatus: OrderStatus | null;
};

export type CustomerLinkGroup = CustomerLinkHistoryItem & {
  lastServiceId: string | null;
  lastQuantity: number;
  spent: number;
  activeCount: number;
};

export type CustomerDetail = CustomerRow & {
  orderCount: number;
  spent: number;
  activeCount: number;
  currency: string;
  links: CustomerLinkGroup[];
  orders: CustomerOrderItem[];
};

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const nameSchema = z
  .string()
  .trim()
  .min(1, "Enter a customer name.")
  .max(120, "Keep the name under 120 characters.");

const notesSchema = z
  .string()
  .trim()
  .max(2000, "Notes are too long.")
  .optional()
  .transform((v) => (v ? v : null));

const createSchema = z.object({
  name: nameSchema,
  notes: notesSchema,
});

const updateSchema = z.object({
  id: z.string().uuid(),
  name: nameSchema,
  notes: notesSchema,
});

function fail(e: unknown): { ok: false; error: string } {
  if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Check the form." };
  if (e instanceof Error && (e.message === "FORBIDDEN" || e.message === "UNAUTHORIZED")) {
    return { ok: false, error: "You're not allowed to do that." };
  }
  return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
}

function duplicateNameError(message: string) {
  if (/customers_name_lower_unique|duplicate key/i.test(message)) {
    return "A customer with that name already exists.";
  }
  return message;
}

type CustomerStats = {
  orderCount: number;
  lastOrderAt: string | null;
  spent: number;
  activeCount: number;
  currency: string;
};

async function orderStatsByCustomerIds(ids: string[]) {
  const map = new Map<string, CustomerStats>();
  if (!ids.length) return map;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("customer_id, created_at, status, customer_charge, currency")
    .in("customer_id", ids)
    .order("created_at", { ascending: false });
  if (error) throw error;

  for (const row of data ?? []) {
    if (!row.customer_id) continue;
    let cur = map.get(row.customer_id);
    if (!cur) {
      cur = { orderCount: 0, lastOrderAt: row.created_at, spent: 0, activeCount: 0, currency: row.currency };
      map.set(row.customer_id, cur);
    }
    cur.orderCount += 1;
    if (row.status !== "provider_failed") cur.spent += Number(row.customer_charge) || 0;
    if (ACTIVE.includes(row.status)) cur.activeCount += 1;
  }
  return map;
}

function withStats(c: CustomerRow, s: CustomerStats | undefined): CustomerListItem {
  return {
    ...c,
    orderCount: s?.orderCount ?? 0,
    lastOrderAt: s?.lastOrderAt ?? null,
    spent: s?.spent ?? 0,
    activeCount: s?.activeCount ?? 0,
    currency: s?.currency ?? "USD",
  };
}

export async function listCustomersAction(): Promise<Result<CustomerListItem[]>> {
  try {
    await requireOwner();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;

    const rows = data ?? [];
    const stats = await orderStatsByCustomerIds(rows.map((r) => r.id));
    const list: CustomerListItem[] = rows.map((c) => withStats(c, stats.get(c.id)));
    return { ok: true, data: list };
  } catch (e) {
    return fail(e);
  }
}

export async function searchCustomersAction(query: string): Promise<Result<CustomerListItem[]>> {
  try {
    await requireOwner();
    const q = query.trim();
    const supabase = createAdminClient();
    let dbQuery = supabase.from("customers").select("*").order("name", { ascending: true }).limit(20);
    if (q) {
      const safe = q.replace(/[%,()]/g, " ");
      dbQuery = dbQuery.ilike("name", `%${safe}%`);
    }
    const { data, error } = await dbQuery;
    if (error) throw error;

    const rows = data ?? [];
    const stats = await orderStatsByCustomerIds(rows.map((r) => r.id));
    const list: CustomerListItem[] = rows.map((c) => withStats(c, stats.get(c.id)));
    return { ok: true, data: list };
  } catch (e) {
    return fail(e);
  }
}

export async function createCustomerAction(input: {
  name: string;
  notes?: string;
}): Promise<Result<CustomerRow>> {
  try {
    await requireOwner();
    const parsed = createSchema.parse(input);
    const supabase = createAdminClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: parsed.name,
        notes: parsed.notes,
        updated_at: now,
      })
      .select("*")
      .single();
    if (error) return { ok: false, error: duplicateNameError(error.message) };
    revalidatePath("/customers");
    return { ok: true, data: data as CustomerRow };
  } catch (e) {
    return fail(e);
  }
}

export async function updateCustomerAction(input: {
  id: string;
  name: string;
  notes?: string;
}): Promise<Result<CustomerRow>> {
  try {
    await requireOwner();
    const parsed = updateSchema.parse(input);
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("customers")
      .update({
        name: parsed.name,
        notes: parsed.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.id)
      .select("*")
      .single();
    if (error) return { ok: false, error: duplicateNameError(error.message) };
    revalidatePath("/customers");
    revalidatePath(`/customers/${parsed.id}`);
    return { ok: true, data: data as CustomerRow };
  } catch (e) {
    return fail(e);
  }
}

export async function getCustomerDetailAction(id: string): Promise<Result<CustomerDetail>> {
  try {
    await requireOwner();
    const supabase = createAdminClient();
    const { data: customer, error: cErr } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!customer) return { ok: false, error: "Customer not found." };

    const { data: rows, error: oErr } = await supabase
      .from("orders")
      .select(
        "id, provider_order_id, provider_service_id, service_name, target_url, quantity, remains, status, customer_charge, currency, created_at"
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: false });
    if (oErr) throw oErr;

    const orders: CustomerOrderItem[] = (rows ?? []).map((o) => ({
      id: o.id,
      providerOrderId: o.provider_order_id,
      serviceId: o.provider_service_id,
      serviceName: o.service_name,
      link: o.target_url,
      quantity: o.quantity,
      remains: o.remains,
      status: o.status,
      charge: o.customer_charge,
      currency: o.currency,
      createdAt: o.created_at,
    }));

    // Orders are newest first, so the first order seen per link is its latest.
    const byUrl = new Map<string, CustomerLinkGroup>();
    let spent = 0;
    let activeCount = 0;
    for (const o of orders) {
      const charge = o.status === "provider_failed" ? 0 : Number(o.charge) || 0;
      const active = ACTIVE.includes(o.status) ? 1 : 0;
      spent += charge;
      activeCount += active;
      const existing = byUrl.get(o.link);
      if (!existing) {
        byUrl.set(o.link, {
          targetUrl: o.link,
          orderCount: 1,
          lastBoostedAt: o.createdAt,
          lastServiceName: o.serviceName,
          lastServiceId: o.serviceId,
          lastQuantity: o.quantity,
          lastStatus: o.status,
          spent: charge,
          activeCount: active,
        });
      } else {
        existing.orderCount += 1;
        existing.spent += charge;
        existing.activeCount += active;
      }
    }

    return {
      ok: true,
      data: {
        ...(customer as CustomerRow),
        orderCount: orders.length,
        spent,
        activeCount,
        currency: orders[0]?.currency ?? "USD",
        links: [...byUrl.values()],
        orders,
      },
    };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCustomerAction(id: string): Promise<Result> {
  try {
    await requireOwner();
    const supabase = createAdminClient();
    const { count, error: countError } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", id);
    if (countError) throw countError;
    if (count) {
      return {
        ok: false,
        error: `This customer has ${count} order${count === 1 ? "" : "s"} on record, so they're kept for history.`,
      };
    }
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/customers");
    return { ok: true, data: undefined };
  } catch (e) {
    return fail(e);
  }
}
