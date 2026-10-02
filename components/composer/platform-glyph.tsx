import { cn } from "@/lib/utils";

// Monogram badges in each platform's brand colour (lucide has no brand icons).
const GLYPHS: Record<string, { text: string; bg: string; fg?: string }> = {
  instagram: { text: "IG", bg: "linear-gradient(135deg,#f58529,#dd2a7b 55%,#8134af)" },
  tiktok: { text: "TT", bg: "#111111" },
  facebook: { text: "f", bg: "#1877f2" },
  youtube: { text: "YT", bg: "#ff0033" },
  telegram: { text: "TG", bg: "#229ed9" },
  twitter: { text: "X", bg: "#111111" },
  threads: { text: "@", bg: "#111111" },
  whatsapp: { text: "WA", bg: "#25d366" },
  spotify: { text: "SP", bg: "#1db954" },
  twitch: { text: "TW", bg: "#9146ff" },
  kick: { text: "K", bg: "#53fc18", fg: "#0b0b0b" },
  reddit: { text: "R", bg: "#ff4500" },
  discord: { text: "D", bg: "#5865f2" },
  soundcloud: { text: "SC", bg: "#ff5500" },
  linkedin: { text: "in", bg: "#0a66c2" },
  pinterest: { text: "P", bg: "#e60023" },
  snapchat: { text: "SN", bg: "#fffc00", fg: "#0b0b0b" },
  bluesky: { text: "BS", bg: "#1185fe" },
  shopee: { text: "SH", bg: "#ee4d2d" },
  traffic: { text: "www", bg: "#475569" },
};

export function PlatformGlyph({
  platform,
  className,
}: {
  platform: string | null | undefined;
  className?: string;
}) {
  const g = (platform && GLYPHS[platform]) || {
    text: platform ? platform.slice(0, 2).toUpperCase() : "?",
    bg: "var(--muted-foreground)",
  };
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] leading-none font-bold tracking-tight text-white select-none",
        className
      )}
      style={{ background: g.bg, color: g.fg }}
    >
      {g.text}
    </span>
  );
}
