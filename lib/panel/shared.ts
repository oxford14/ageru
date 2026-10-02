// Client-safe helpers shared by the order form, service browser and server.

export type PanelService = {
  id: string;
  name: string;
  category: string;
  /** A PLATFORMS key, or the panel's own platform slug (v3 APIs send one). */
  platform: string;
  type: string;
  /** Price per 1000 in the panel currency (per order for packages). */
  rate: string;
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  dripfeed: boolean;
  /** Typical completion time reported by the panel, when it reports one. */
  avgSeconds: number | null;
};

export const PLATFORMS = [
  { key: "facebook", label: "Facebook", match: /facebook|\bfb\b/ },
  { key: "instagram", label: "Instagram", match: /\binsta(gram)?\b|\big\b/ },
  { key: "tiktok", label: "TikTok", match: /tik\s?tok/ },
  { key: "youtube", label: "YouTube", match: /you\s?tube|\byt\b/ },
  { key: "telegram", label: "Telegram", match: /telegram/ },
  { key: "whatsapp", label: "WhatsApp", match: /whatsapp/ },
  { key: "twitter", label: "X / Twitter", match: /twitter|\bx\.com\b|\(x\)/ },
  { key: "threads", label: "Threads", match: /threads/ },
  { key: "shopee", label: "Shopee", match: /shopee/ },
  { key: "twitch", label: "Twitch", match: /twitch/ },
  { key: "spotify", label: "Spotify", match: /spotify/ },
  { key: "roblox", label: "Roblox", match: /roblox/ },
  { key: "linkedin", label: "LinkedIn", match: /linked\s?in/ },
  { key: "kick", label: "Kick", match: /\bkick\b/ },
  { key: "reddit", label: "Reddit", match: /reddit/ },
  { key: "discord", label: "Discord", match: /discord/ },
  { key: "soundcloud", label: "SoundCloud", match: /soundcloud/ },
  { key: "pinterest", label: "Pinterest", match: /pinterest/ },
  { key: "snapchat", label: "Snapchat", match: /snapchat/ },
  { key: "bluesky", label: "Bluesky", match: /bluesky/ },
  { key: "traffic", label: "Website traffic", match: /website traffic|\btraffic\b/ },
  { key: "other", label: "Other", match: /$^/ },
] as const;

export type PlatformKey = (typeof PLATFORMS)[number]["key"];

const EXTRA_LABELS: Record<string, string> = {
  okru: "OK.ru",
  vk: "VK",
  truthsocial: "Truth Social",
  yandexmusic: "Yandex Music",
  applemusic: "Apple Music",
  github: "GitHub",
};

export function platformLabel(key: string) {
  const known = PLATFORMS.find((p) => p.key === key)?.label ?? EXTRA_LABELS[key];
  if (known) return known;
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : "Other";
}

/** Folds "𝐅𝐚𝐜𝐞𝐛𝐨𝐨𝐤" style lookalike letters and "ᴺᴱᵂ" into plain text. */
export function plainText(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim();
}

export function detectPlatform(name: string, category: string): PlatformKey {
  for (const text of [name, category]) {
    const t = text.toLowerCase();
    for (const p of PLATFORMS) if (p.match.test(t)) return p.key;
  }
  return "other";
}

// ---------------------------------------------------------------------------
// Order types. The panel API takes different fields per service type.

export type OrderFields = {
  quantity: boolean;
  comments: boolean;
  username: boolean;
  answerNumber: boolean;
};

export function fieldsForType(type: string): OrderFields | null {
  // v2 panels say "Custom Comments", v3 panels say "custom_comments".
  switch (type.toLowerCase().replace(/_/g, " ").trim()) {
    case "default":
    case "":
      return { quantity: true, comments: false, username: false, answerNumber: false };
    case "custom comments":
    case "custom comments package":
      return { quantity: false, comments: true, username: false, answerNumber: false };
    case "package":
      return { quantity: false, comments: false, username: false, answerNumber: false };
    case "comment likes":
    case "mentions":
      return { quantity: true, comments: false, username: true, answerNumber: false };
    case "comment replies":
      return { quantity: false, comments: true, username: true, answerNumber: false };
    case "poll":
      return { quantity: true, comments: false, username: false, answerNumber: true };
    default:
      // Subscriptions and other exotic types need extra fields we don't collect.
      return null;
  }
}

export function commentLines(comments: string) {
  return comments
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Cost in the panel currency. Rates are per 1000, packages are a flat price. */
export function estimateCost(service: Pick<PanelService, "rate" | "type">, units: number) {
  const rate = Number(service.rate);
  if (!Number.isFinite(rate)) return 0;
  if (service.type.toLowerCase() === "package") return rate;
  return (rate * units) / 1000;
}

// ---------------------------------------------------------------------------
// Formatting

export function formatCurrency(amount: number | string, currency = "USD") {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  // Panel rates go down to fractions of a cent, so keep two significant
  // digits for tiny amounts instead of rounding them to $0.00.
  const abs = Math.abs(n);
  const digits =
    abs === 0 || abs >= 1 ? 2 : Math.min(8, Math.max(4, 1 - Math.floor(Math.log10(abs))));
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: digits,
    }).format(n);
  } catch {
    return `${n.toFixed(digits)} ${currency}`;
  }
}

export function formatNumber(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

export function timeAgo(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function shortLink(url: string) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "");
    return `${u.hostname.replace(/^www\./, "")}${path}`;
  } catch {
    return url;
  }
}
