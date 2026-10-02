import { PanelV3 } from "@/lib/panel/panel-v3";
import { SmmPanel } from "@/lib/panel/smm-panel";
import {
  detectPlatform,
  plainText,
  type PanelService,
} from "@/lib/panel/shared";

export type PanelApiVersion = "v2" | "v3";

export function getPanelApiVersion(apiKey?: string, apiUrl?: string): PanelApiVersion {
  const explicit = process.env.PROVIDER_API_VERSION?.trim().toLowerCase();
  if (explicit === "v2" || explicit === "v3") return explicit;
  const key = apiKey ?? process.env.PROVIDER_API_KEY?.trim() ?? "";
  if (key.startsWith("pf_live_") || key.startsWith("pf_test_")) return "v3";
  const url = apiUrl ?? process.env.PROVIDER_API_URL?.trim() ?? "";
  if (url.includes("/api/v3")) return "v3";
  return "v2";
}

function resolvePanelBaseUrl(apiUrl: string, version: PanelApiVersion) {
  const u = new URL(apiUrl);
  if (version === "v3") {
    return `${u.origin}/api/v3`;
  }
  if (u.pathname.includes("/api/v3")) {
    return `${u.origin}/api/v2`;
  }
  return apiUrl.replace(/\/$/, "");
}

export function getPanelConfig() {
  const apiUrl = process.env.PROVIDER_API_URL?.trim();
  const apiKey = process.env.PROVIDER_API_KEY?.trim();
  if (!apiUrl || !apiKey) return null;
  const apiVersion = getPanelApiVersion(apiKey, apiUrl);
  const panelBaseUrl = resolvePanelBaseUrl(apiUrl, apiVersion);
  let origin = "";
  try {
    origin = new URL(apiUrl).origin;
  } catch {
    // leave empty; the settings page shows the raw value
  }
  const host = origin.replace(/^https?:\/\//, "");
  const defaultName =
    host.includes("panelfollows.com")
      ? "PanelFollows"
      : host.includes("smmworld.org")
        ? "SMM World"
        : host || "SMM panel";

  return {
    apiUrl: panelBaseUrl,
    apiKey,
    apiVersion,
    name: process.env.PROVIDER_NAME?.trim() || defaultName,
    host,
    topUpUrl:
      process.env.PROVIDER_TOPUP_URL?.trim() || (origin ? `${origin}/addfunds` : ""),
  };
}

export class PanelNotConfiguredError extends Error {
  constructor() {
    super("Set PROVIDER_API_URL and PROVIDER_API_KEY in .env.local, then restart the server.");
  }
}

export function getPanel() {
  const cfg = getPanelConfig();
  if (!cfg) throw new PanelNotConfiguredError();
  if (cfg.apiVersion === "v3") {
    return new PanelV3(cfg.apiUrl, cfg.apiKey);
  }
  return new SmmPanel(cfg.apiUrl, cfg.apiKey);
}

// ---------------------------------------------------------------------------
// Small in-process caches. The catalog is ~2k services and takes a few
// seconds to download, so it is kept for 10 minutes; the balance for 30s.

type Cached<T> = { value: T; at: number } | null;

function memo<T>(ttlMs: number, load: () => Promise<T>) {
  let cached: Cached<T> = null;
  let inflight: Promise<T> | null = null;
  const get = async (opts?: { fresh?: boolean }) => {
    if (!opts?.fresh && cached && Date.now() - cached.at < ttlMs) return cached.value;
    if (inflight) return inflight;
    inflight = load()
      .then((value) => {
        cached = { value, at: Date.now() };
        return value;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };
  return Object.assign(get, {
    fetchedAt: () => cached?.at ?? null,
    clear: () => {
      cached = null;
    },
  });
}

function isNoticeRow(name: string, category: string) {
  // Panels use fake services as section headers / warnings.
  return (
    /^[-–—=_\s]{3,}/.test(category) ||
    /please read|read before order/i.test(name) ||
    /^\d*$/.test(name.trim())
  );
}

// Descriptions are large (~2 MB for a v3 catalog), so they stay on the server
// and are fetched one at a time when a service is opened.
let descriptions = new Map<string, string>();

export async function getServiceDescription(id: string) {
  await getCatalog();
  return descriptions.get(id) ?? null;
}

export const getCatalog = memo(10 * 60_000, async (): Promise<PanelService[]> => {
  const raw = await getPanel().services();
  if (!Array.isArray(raw)) return [];
  const out: PanelService[] = [];
  const nextDescriptions = new Map<string, string>();
  for (const s of raw) {
    const name = plainText(String(s.name ?? ""));
    const category = plainText(String(s.category ?? "Uncategorised"));
    if (isNoticeRow(name, category)) continue;
    if (s.description) nextDescriptions.set(String(s.service), s.description);
    out.push({
      id: String(s.service),
      name,
      category,
      platform: s.platform?.trim().toLowerCase() || detectPlatform(name, category),
      avgSeconds: s.avgSeconds != null && s.avgSeconds > 0 ? Number(s.avgSeconds) : null,
      type: String(s.type ?? "Default"),
      rate: String(s.rate),
      min: Number(s.min) || 1,
      max: Number(s.max) || 1,
      refill: Boolean(s.refill),
      cancel: Boolean(s.cancel),
      dripfeed: Boolean(s.dripfeed),
    });
  }
  descriptions = nextDescriptions;
  return out;
});

export async function findService(id: string) {
  const catalog = await getCatalog();
  const hit = catalog.find((s) => s.id === id);
  if (hit) return hit;
  // A service may have been added since the last refresh.
  const fresh = await getCatalog({ fresh: true });
  return fresh.find((s) => s.id === id) ?? null;
}

export const getBalance = memo(30_000, async () => {
  const b = await getPanel().balance();
  return { balance: Number(b.balance), currency: b.currency || "USD" };
});

/** Never throws; pages render a "not connected" state instead. */
export async function tryGetBalance() {
  try {
    return { ok: true as const, ...(await getBalance()), checkedAt: getBalance.fetchedAt() };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "Could not reach the panel.",
    };
  }
}
