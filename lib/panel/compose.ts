// Client-safe logic behind the order composer: reading a pasted link,
// grouping services into goals, and choosing a few good picks per goal.

import { fieldsForType, type PanelService } from "@/lib/panel/shared";

// ---------------------------------------------------------------------------
// Goals

export type GoalKey =
  | "followers"
  | "likes"
  | "views"
  | "comments"
  | "shares"
  | "saves"
  | "live"
  | "votes"
  | "other";

// The keyword that appears first in the name wins ("Likes + Reach" is likes);
// list order breaks ties ("comment likes" are likes, not comments).
const GOAL_RULES: [GoalKey, RegExp][] = [
  ["comments", /comment(?!\s*like)|repl(y|ies)/],
  ["live", /live\s*stream|livestream|live view|concurrent|\blive\b/],
  ["followers", /follower|subscriber|\bsubs\b|member|\bfriends?\b|\bjoin|page like|connection/],
  ["shares", /share|retweet|re-?post/],
  ["saves", /\bsaves?\b|bookmark/],
  ["votes", /vote|poll/],
  ["views", /view|play|watch|impression|reach|listen|stream|visit|traffic|click|engagement/],
  ["likes", /like|heart|reaction|react|upvote|favou?rite|love|clap/],
];

function firstGoalIn(text: string): GoalKey | null {
  let best: { goal: GoalKey; at: number } | null = null;
  for (const [goal, re] of GOAL_RULES) {
    const at = text.search(re);
    if (at >= 0 && (!best || at < best.at)) best = { goal, at };
  }
  return best?.goal ?? null;
}

export function goalOf(service: Pick<PanelService, "name" | "category">): GoalKey {
  // Prefer what the service name says; fall back to the category.
  return (
    firstGoalIn(service.name.toLowerCase()) ??
    firstGoalIn(service.category.toLowerCase()) ??
    "other"
  );
}

export const GOAL_ORDER: GoalKey[] = [
  "followers",
  "likes",
  "views",
  "comments",
  "shares",
  "saves",
  "live",
  "votes",
  "other",
];

export function goalLabel(goal: GoalKey, platform?: string | null) {
  switch (goal) {
    case "followers":
      if (platform === "youtube") return "Subscribers";
      if (platform === "telegram" || platform === "discord" || platform === "whatsapp") return "Members";
      if (platform === "linkedin") return "Connections";
      return "Followers";
    case "likes":
      return platform === "facebook" ? "Likes & reactions" : "Likes";
    case "views":
      if (["spotify", "soundcloud", "audiomack", "applemusic", "yandexmusic"].includes(platform ?? "")) return "Plays";
      if (platform === "traffic") return "Visitors";
      if (platform === "twitter") return "Views & clicks";
      return "Views";
    case "comments":
      return "Comments";
    case "shares":
      return platform === "twitter" ? "Reposts" : "Shares";
    case "saves":
      return "Saves";
    case "live":
      return "Live viewers";
    case "votes":
      return "Votes";
    default:
      return "Something else";
  }
}

// ---------------------------------------------------------------------------
// Links

export type TargetKind =
  | "profile"
  | "post"
  | "reel"
  | "video"
  | "short"
  | "story"
  | "live"
  | "channel"
  | "group"
  | "page"
  | "track"
  | "playlist"
  | "server"
  | "website"
  | "username";

const KIND_LABEL: Record<TargetKind, string> = {
  profile: "Profile",
  post: "Post",
  reel: "Reel",
  video: "Video",
  short: "Short",
  story: "Story",
  live: "Live stream",
  channel: "Channel",
  group: "Group",
  page: "Page",
  track: "Track",
  playlist: "Playlist",
  server: "Server",
  website: "Website",
  username: "Username",
};

const SUGGESTED: Record<TargetKind, GoalKey[]> = {
  profile: ["followers"],
  channel: ["followers", "views"],
  page: ["followers", "likes"],
  group: ["followers"],
  server: ["followers"],
  username: ["followers"],
  post: ["likes", "comments", "shares"],
  reel: ["views", "likes", "comments"],
  video: ["views", "likes", "comments"],
  short: ["views", "likes"],
  story: ["views"],
  live: ["live"],
  track: ["views", "saves"],
  playlist: ["views", "followers"],
  website: ["views"],
};

export type LinkInsight = {
  /** Normalised link to submit (adds https:// when it was left off). */
  link: string;
  platform: string | null;
  kind: TargetKind | null;
  kindLabel: string | null;
  handle: string | null;
  suggested: GoalKey[];
};

const HOSTS: [RegExp, string][] = [
  [/(^|\.)instagram\.com$|(^|\.)instagr\.am$/, "instagram"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)fb\.watch$/, "facebook"],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, "youtube"],
  [/(^|\.)t\.me$|(^|\.)telegram\.(me|org)$/, "telegram"],
  [/(^|\.)x\.com$|(^|\.)twitter\.com$/, "twitter"],
  [/(^|\.)threads\.(net|com)$/, "threads"],
  [/(^|\.)spotify\.com$/, "spotify"],
  [/(^|\.)twitch\.tv$/, "twitch"],
  [/(^|\.)kick\.com$/, "kick"],
  [/(^|\.)reddit\.com$|(^|\.)redd\.it$/, "reddit"],
  [/(^|\.)discord\.(gg|com)$/, "discord"],
  [/(^|\.)soundcloud\.com$/, "soundcloud"],
  [/(^|\.)linkedin\.com$/, "linkedin"],
  [/(^|\.)pinterest\.[a-z.]+$|(^|\.)pin\.it$/, "pinterest"],
  [/(^|\.)snapchat\.com$/, "snapchat"],
  [/(^|\.)bsky\.app$/, "bluesky"],
  [/(^|\.)whatsapp\.com$|(^|\.)wa\.me$/, "whatsapp"],
  [/(^|\.)shopee\.[a-z.]+$/, "shopee"],
];

function kindFor(platform: string, url: URL): { kind: TargetKind; handle: string | null } {
  const path = url.pathname.replace(/\/+$/, "");
  const seg = path.split("/").filter(Boolean);
  const first = seg[0]?.toLowerCase() ?? "";
  const at = (s?: string) => (s ? s.replace(/^@/, "") : null);

  switch (platform) {
    case "instagram":
      if (first === "p") return { kind: "post", handle: null };
      if (first === "reel" || first === "reels") return { kind: "reel", handle: null };
      if (first === "tv") return { kind: "video", handle: null };
      if (first === "stories") return { kind: "story", handle: at(seg[1]) };
      return { kind: "profile", handle: at(seg[0]) };
    case "tiktok":
      if (/^(vm|vt)\./.test(url.hostname)) return { kind: "video", handle: null };
      if (seg[1] === "video") return { kind: "video", handle: at(seg[0]) };
      if (seg[1] === "live") return { kind: "live", handle: at(seg[0]) };
      return { kind: "profile", handle: at(seg[0]) };
    case "facebook":
      if (url.hostname.endsWith("fb.watch") || /reel|videos|watch/.test(path)) return { kind: "video", handle: null };
      if (/posts|photo|permalink|story\.php|share\/p/.test(path)) return { kind: "post", handle: null };
      if (first === "groups") return { kind: "group", handle: seg[1] ?? null };
      if (first === "events") return { kind: "page", handle: null };
      return { kind: "page", handle: seg[0] ?? null };
    case "youtube":
      if (url.hostname.endsWith("youtu.be") || first === "watch") return { kind: "video", handle: null };
      if (first === "shorts") return { kind: "short", handle: null };
      if (first === "live") return { kind: "live", handle: null };
      return { kind: "channel", handle: at(seg[0] === "channel" || seg[0] === "c" ? seg[1] : seg[0]) };
    case "telegram":
      if (seg.length >= 2 && /^\d+$/.test(seg[1])) return { kind: "post", handle: seg[0] };
      return { kind: "channel", handle: seg[0] ?? null };
    case "twitter":
      if (seg[1] === "status") return { kind: "post", handle: at(seg[0]) };
      return { kind: "profile", handle: at(seg[0]) };
    case "threads":
      if (seg[1] === "post") return { kind: "post", handle: at(seg[0]) };
      return { kind: "profile", handle: at(seg[0]) };
    case "spotify":
      if (first === "playlist") return { kind: "playlist", handle: null };
      if (first === "artist" || first === "user") return { kind: "profile", handle: null };
      return { kind: "track", handle: null };
    case "soundcloud":
      return seg.length >= 2 ? { kind: "track", handle: seg[0] } : { kind: "profile", handle: seg[0] ?? null };
    case "twitch":
    case "kick":
      if (first === "videos") return { kind: "video", handle: null };
      return { kind: "channel", handle: seg[0] ?? null };
    case "discord":
      return { kind: "server", handle: null };
    case "reddit":
      if (seg.includes("comments")) return { kind: "post", handle: null };
      return { kind: "profile", handle: seg[1] ?? null };
    default:
      return { kind: seg.length > 1 ? "post" : "profile", handle: seg[0] ?? null };
  }
}

export function readLink(raw: string): LinkInsight | null {
  const value = raw.trim();
  if (!value) return null;

  // Usernames need the @ so half-typed links don't read as usernames.
  if (/^@[\w.]{2,40}$/.test(value)) {
    return {
      link: value,
      platform: null,
      kind: "username",
      kindLabel: KIND_LABEL.username,
      handle: value.replace(/^@/, ""),
      suggested: SUGGESTED.username,
    };
  }

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (!url.hostname.includes(".")) return null;
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^(www|m|mobile|web)\./, "");
  const platform = HOSTS.find(([re]) => re.test(host))?.[1] ?? "traffic";
  const { kind, handle } = platform === "traffic" ? { kind: "website" as const, handle: null } : kindFor(platform, url);
  return {
    link: url.toString(),
    platform,
    kind,
    kindLabel: KIND_LABEL[kind],
    handle,
    suggested: SUGGESTED[kind],
  };
}

/** Narrows a goal to services that fit the kind of target (story views vs reel views). */
export function fitsTarget(service: PanelService, kind: TargetKind | null) {
  const n = service.name.toLowerCase();
  const storySpecific = /\bstor(y|ies)\b/.test(n);
  const commentSpecific = /comment\s*like/.test(n);
  if (kind === "story") return storySpecific;
  if (storySpecific || commentSpecific) return false;
  if (kind === "live") return /live/.test(n);
  return true;
}

// ---------------------------------------------------------------------------
// Picks

export type PickReason = "favorite" | "usual" | "cheapest" | "refill" | "fastest";

export type ServicePick = { service: PanelService; reason: PickReason };

export const PICK_COPY: Record<PickReason, { title: string; note: string }> = {
  favorite: { title: "Favourite", note: "A service you starred" },
  usual: { title: "Your usual", note: "What you've ordered here before" },
  cheapest: { title: "Lowest price", note: "Cheapest per 1,000" },
  refill: { title: "Refill included", note: "Cheapest with drop protection" },
  fastest: { title: "Fastest", note: "Shortest typical delivery" },
};

export function speedPerDay(name: string) {
  const m =
    name.match(/(\d+(?:\.\d+)?)\s*([km])?\s*\/\s*d(?:ay)?\b/i) ??
    name.match(/\bday\s*(\d+(?:\.\d+)?)\s*([km])?/i);
  if (!m) return null;
  const mult = m[2]?.toLowerCase() === "m" ? 1_000_000 : m[2]?.toLowerCase() === "k" ? 1000 : 1;
  return Number(m[1]) * mult;
}

export function pickServices(
  candidates: PanelService[],
  usage: Map<string, number>,
  favorites: ReadonlySet<string> = new Set()
): ServicePick[] {
  const list = candidates.filter((s) => fieldsForType(s.type));
  if (!list.length) return [];
  const byRate = [...list].sort((a, b) => Number(a.rate) - Number(b.rate));
  const picks: ServicePick[] = [];
  const add = (service: PanelService | undefined, reason: PickReason) => {
    if (service && !picks.some((p) => p.service.id === service.id)) picks.push({ service, reason });
  };

  // Starred services always come first, then up to two suggestions after them.
  for (const s of list) if (favorites.has(s.id)) add(s, "favorite");
  const limit = Math.max(4, Math.min(picks.length, 4) + 2);

  const usual = [...list]
    .filter((s) => usage.has(s.id))
    .sort((a, b) => (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0))[0];
  add(usual, "usual");
  add(byRate[0], "cheapest");
  add(byRate.find((s) => s.refill), "refill");

  // "Fastest" only among reasonably priced options, not a $50/1k specialty.
  const median = Number(byRate[Math.floor(byRate.length / 2)].rate);
  const affordable = list.filter((s) => Number(s.rate) <= median * 3);
  const timed = affordable.filter((s) => s.avgSeconds != null);
  const fastest = timed.length
    ? [...timed].sort((a, b) => a.avgSeconds! - b.avgSeconds!)[0]
    : [...affordable]
        .map((s) => ({ s, v: speedPerDay(s.name) ?? 0 }))
        .filter((x) => x.v > 0)
        .sort((a, b) => b.v - a.v)[0]?.s;
  add(fastest, "fastest");

  return picks.slice(0, limit);
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const m = seconds / 60;
  if (m < 1) return "under a minute";
  if (m < 60) return `~${Math.round(m)} min`;
  const h = m / 60;
  if (h < 24) return `~${Math.round(h)} h`;
  const d = h / 24;
  return `~${Math.round(d)} day${Math.round(d) === 1 ? "" : "s"}`;
}

/** Quantity ↔ slider position on a log scale so both 50 and 1,000,000 are reachable. */
export function quantityToSlider(q: number, min: number, max: number) {
  if (max <= min) return 1000;
  const lo = Math.log(Math.max(1, min));
  const hi = Math.log(Math.max(1, max));
  return Math.round(((Math.log(Math.max(min, Math.min(max, q))) - lo) / (hi - lo)) * 1000);
}

export function sliderToQuantity(pos: number, min: number, max: number) {
  if (max <= min) return min;
  const lo = Math.log(Math.max(1, min));
  const hi = Math.log(Math.max(1, max));
  const raw = Math.exp(lo + ((hi - lo) * pos) / 1000);
  // Snap to friendly numbers.
  const step = raw < 100 ? 5 : raw < 1000 ? 50 : raw < 10_000 ? 100 : raw < 100_000 ? 1000 : 10_000;
  return Math.max(min, Math.min(max, Math.round(raw / step) * step));
}
