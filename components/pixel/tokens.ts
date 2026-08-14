import type { CSSProperties } from "react";

/** Palette from frontend/LARP_EXO_design_system.html. */
export const GOLD = "#ffd700";
export const GOLD_DARK = "#b8860b";
export const INK = "#0a0a0a";
export const GREEN = "#22c55e";
export const RED = "#ef4444";
export const BLUE = "#4a9eff";
export const PURPLE = "#a855f7";

/** Arcade display type. Sizes are strings so callers can pass clamp() values. */
export function pxS(size: string): CSSProperties {
  return { fontFamily: "var(--font-pixel)", fontSize: size };
}

/** Body type for anything that has to stay readable at small sizes. */
export function monoS(size: number): CSSProperties {
  return { fontFamily: "var(--font-body)", fontSize: size };
}

/** The chunky offset shadow that gives buttons their arcade depth. */
export const goldShadow = (depth = 4) => `${depth}px ${depth}px 0 ${GOLD_DARK}`;
