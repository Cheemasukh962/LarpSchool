/**
 * Bridges real guest cards to the shapes the LARP EXO design expects.
 *
 * The mock was built around invented personas with `initials`, `gradient`, `role` and
 * `tagline`. Real data has `name`, `title`, `company`, `compliment` and a photo. Everything
 * that fills those gaps lives here so the screens stay presentational.
 */
import type { Card, SchoolTier } from "./types";

/** Avatar gradients carried over from the mock's challenger list. */
const GRADIENTS = [
  "from-rose-400 to-orange-400",
  "from-cyan-400 to-blue-600",
  "from-lime-400 to-emerald-600",
  "from-violet-400 to-fuchsia-600",
  "from-amber-400 to-red-500",
  "from-teal-400 to-cyan-600",
  "from-pink-400 to-purple-600",
  "from-yellow-300 to-orange-500",
];

/** Max points per bar, from the scoring rubric in scripts/larp_engine.py. */
export const BAR_MAX = { school: 32, work: 32, presence: 26, projects: 10 } as const;

export const BARS = [
  { key: "school", label: "SCHOOL", color: "#ffd700" },
  { key: "work", label: "WORK", color: "#ffd700" },
  { key: "presence", label: "PRESENCE", color: "#4a9eff" },
  { key: "projects", label: "PROJECTS", color: "#a855f7" },
] as const;

const TIER_LABEL: Record<SchoolTier, string> = {
  T0: "TIER 0",
  T1: "TIER 1",
  T2: "TIER 2",
  HS: "HIGH SCHOOL",
  none: "UNSCHOOLED",
};

const TIER_COLOR: Record<SchoolTier, string> = {
  T0: "#ffd700",
  T1: "#4a9eff",
  T2: "#a855f7",
  HS: "#888888",
  none: "#666666",
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function gradientFor(id: string): string {
  return GRADIENTS[hash(id) % GRADIENTS.length];
}

export function tierLabel(tier: SchoolTier): string {
  return TIER_LABEL[tier] ?? TIER_LABEL.none;
}

export function tierColor(tier: SchoolTier): string {
  return TIER_COLOR[tier] ?? TIER_COLOR.none;
}

/**
 * The two lines under a name, chosen together so they never say the same thing twice.
 * Most guests have a company but no title, so a naive "role = company, sub = company"
 * pairing would print the employer twice.
 */
export function identityLines(card: Card): { role: string; sub: string } {
  if (card.title) return { role: card.title, sub: card.company || card.school || "NO AFFILIATION LISTED" };
  if (card.company) return { role: "BUILDING AT " + card.company, sub: card.school || "NO SCHOOL LISTED" };
  if (card.school) return { role: tierLabel(card.school_tier) + " STUDENT", sub: card.school };
  return { role: "UNVERIFIED LARPER", sub: "NO AFFILIATION LISTED" };
}

export function roleFor(card: Card): string {
  return identityLines(card).role;
}

/** The italic quote on a profile card. The compliment is the flattering half of a verdict. */
export function taglineFor(card: Card): string {
  return card.compliment || card.roast || "No receipts on file.";
}

/** Written by scripts/build_photos.mjs, named by luma id so no slug lookup is needed. */
export function photoUrl(card: Card): string | null {
  return card.has_photo ? `/photos/${card.id}.webp` : null;
}

export function followersLabel(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "K";
  return String(n);
}
