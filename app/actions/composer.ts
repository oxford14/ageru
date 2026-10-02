"use server";

import { requireOwner } from "@/lib/auth/owner";
import { getCatalog, getPanelConfig, getServiceDescription, tryGetBalance } from "@/lib/panel";
import type { PanelService } from "@/lib/panel/shared";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/supabase/database.types";

export type ComposerHistoryItem = {
  id: string;
  providerOrderId: string | null;
  serviceId: string | null;
  serviceName: string | null;
  link: string;
  quantity: number;
  remains: number | null;
  status: OrderStatus;
  createdAt: string;
  refillSupported: boolean;
  refillRequestedAt: string | null;
  charge: string;
  currency: string;
};

export type ComposerCatalog =
  | {
      ok: true;
      services: PanelService[];
      panelName: string;
      topUpUrl: string;
      loadedAt: number;
    }
  | { ok: false; error: string };

export type ComposerContext = {
  balance: number | null;
  currency: string;
  history: ComposerHistoryItem[];
  /** Starred panel service ids, newest first. */
  favorites: string[];
};

/** The service list. Large, so the client loads it once and keeps it. */
export async function getComposerCatalogAction(): Promise<ComposerCatalog> {
  try {
    await requireOwner();
    const cfg = getPanelConfig();
    const services = await getCatalog();
    return {
      ok: true,
      services,
      panelName: cfg?.name ?? "the panel",
      topUpUrl: cfg?.topUpUrl ?? "",
      loadedAt: Date.now(),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn't load services." };
  }
}

/** Balance and recent orders. Small, refreshed every time the composer opens. */
export async function getComposerContextAction(): Promise<ComposerContext> {
  const user = await requireOwner();
  const supabase = await createClient();
  const [balance, { data }, favorites] = await Promise.all([
    tryGetBalance(),
    supabase
      .from("orders")
      .select(
        "id, provider_order_id, provider_service_id, service_name, target_url, quantity, remains, status, created_at, refill_supported, refill_requested_at, customer_charge, currency"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("favorite_services")
      .select("service_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      // Before the migration runs the table is missing; treat that as "none yet".
      .then(({ data: rows }) => (rows ?? []).map((r) => r.service_id)),
  ]);

  return {
    balance: balance.ok ? balance.balance : null,
    currency: balance.ok ? balance.currency : "USD",
    favorites,
    history: (data ?? []).map((o) => ({
      id: o.id,
      providerOrderId: o.provider_order_id,
      serviceId: o.provider_service_id,
      serviceName: o.service_name,
      link: o.target_url,
      quantity: o.quantity,
      remains: o.remains,
      status: o.status,
      createdAt: o.created_at,
      refillSupported: o.refill_supported,
      refillRequestedAt: o.refill_requested_at,
      charge: o.customer_charge,
      currency: o.currency,
    })),
  };
}

export async function getServiceDescriptionAction(serviceId: string): Promise<string | null> {
  await requireOwner();
  return getServiceDescription(serviceId);
}

export async function toggleFavoriteAction(
  serviceId: string,
  favorite: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireOwner();
    const supabase = await createClient();
    const { error } = favorite
      ? await supabase
          .from("favorite_services")
          .upsert({ user_id: user.id, service_id: serviceId }, { onConflict: "user_id,service_id" })
      : await supabase
          .from("favorite_services")
          .delete()
          .eq("user_id", user.id)
          .eq("service_id", serviceId);
    if (error) {
      const missing = error.code === "42P01" || error.code === "PGRST205";
      return {
        ok: false,
        error: missing
          ? "Favourites need the latest Supabase migration (favorite_services)."
          : "Couldn't save the favourite.",
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Sign in again to save favourites." };
  }
}
