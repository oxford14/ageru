import { useId } from "react";
import { cn } from "@/lib/utils";

/** The "A + rising arrow" mark from the Ageru logo, as a crisp inline SVG. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-7", className)}>
      <defs>
        <linearGradient id={id} x1="6" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2f80ff" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path d="M16 2.5 29.5 28h-6.1L16 13.4 8.6 28H2.5L16 2.5Z" fill={`url(#${id})`} />
      <path d="m16 14.5 4.2 6h-2.7V28h-3v-7.5h-2.7l4.2-6Z" fill={`url(#${id})`} opacity=".85" />
    </svg>
  );
}
