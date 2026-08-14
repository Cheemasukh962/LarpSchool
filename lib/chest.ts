/**
 * Loot chest table and reel geometry, lifted out of the mock component.
 *
 * Like lib/slots.ts, the draw is client-side until Phase 3. The reel constants stay on the
 * client permanently since they only describe the animation.
 */

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface ChestItem {
  id: number;
  name: string;
  icon: string;
  rarity: Rarity;
  border: string;
  bg: string;
  glow: string;
}

export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

export const CHEST_ITEMS: ChestItem[] = [
  { id: 1, name: "PEASANT SCROLL", icon: "📜", rarity: "common", border: "#666", bg: "#111", glow: "#66666633" },
  { id: 2, name: "WOODEN SWORD", icon: "🗡️", rarity: "common", border: "#666", bg: "#111", glow: "#66666633" },
  { id: 3, name: "LEATHER CAP", icon: "🪖", rarity: "common", border: "#666", bg: "#111", glow: "#66666633" },
  { id: 4, name: "TAVERN COIN", icon: "🪙", rarity: "common", border: "#666", bg: "#111", glow: "#66666633" },
  { id: 5, name: "ROPE & HOOK", icon: "🪝", rarity: "common", border: "#666", bg: "#111", glow: "#66666633" },
  { id: 6, name: "SILVER DAGGER", icon: "⚔️", rarity: "uncommon", border: "#4a9eff", bg: "#05111f", glow: "#4a9eff44" },
  { id: 7, name: "MAGIC MAP", icon: "🗺️", rarity: "uncommon", border: "#4a9eff", bg: "#05111f", glow: "#4a9eff44" },
  { id: 8, name: "ENCHANT WAND", icon: "🪄", rarity: "uncommon", border: "#4a9eff", bg: "#05111f", glow: "#4a9eff44" },
  { id: 9, name: "SHADOW CLOAK", icon: "🦇", rarity: "rare", border: "#a855f7", bg: "#0e0518", glow: "#a855f755" },
  { id: 10, name: "DRAGON EGG", icon: "🥚", rarity: "rare", border: "#a855f7", bg: "#0e0518", glow: "#a855f755" },
  { id: 11, name: "ARCANE TOME", icon: "📕", rarity: "rare", border: "#a855f7", bg: "#0e0518", glow: "#a855f755" },
  { id: 12, name: "VOID CRYSTAL", icon: "💎", rarity: "epic", border: "#ec4899", bg: "#1a0511", glow: "#ec489966" },
  { id: 13, name: "PHOENIX PLUME", icon: "🔥", rarity: "epic", border: "#ec4899", bg: "#1a0511", glow: "#ec489966" },
  { id: 14, name: "CHAOS SHARD", icon: "⚡", rarity: "epic", border: "#ec4899", bg: "#1a0511", glow: "#ec489966" },
  { id: 15, name: "CROWN OF REALM", icon: "👑", rarity: "legendary", border: "#ffd700", bg: "#140d00", glow: "#ffd70077" },
  { id: 16, name: "DRAGON HEART", icon: "❤️‍🔥", rarity: "legendary", border: "#ffd700", bg: "#140d00", glow: "#ffd70077" },
];

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 50,
  uncommon: 28,
  rare: 14,
  epic: 6,
  legendary: 2,
};

/* Reel geometry. Purely cosmetic: the winner is always parked at WINNER_IDX. */
export const REEL_LEN = 70;
export const WINNER_IDX = 55;
export const ITEM_W = 80;
export const ITEM_GAP = 6;
export const ITEM_STRIDE = ITEM_W + ITEM_GAP;
export const CONTAINER_W = 390;
export const CHEST_COST = 1;

export function itemById(id: number): ChestItem {
  return CHEST_ITEMS.find((i) => i.id === id) ?? CHEST_ITEMS[0];
}

export function sampleRarity(r: Rarity): ChestItem {
  const pool = CHEST_ITEMS.filter((i) => i.rarity === r);
  return pool[Math.floor(Math.random() * pool.length)] ?? CHEST_ITEMS[0];
}

export function weightedChestItem(): ChestItem {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const rarity of RARITY_ORDER) {
    r -= RARITY_WEIGHTS[rarity];
    if (r <= 0) return sampleRarity(rarity);
  }
  return CHEST_ITEMS[0];
}

export function buildReel(winner: ChestItem): ChestItem[] {
  const arr = Array.from({ length: REEL_LEN }, () => weightedChestItem());
  arr[WINNER_IDX] = winner;
  return arr;
}

/** Pixel offset that lands WINNER_IDX under the center marker. */
export function finalTranslateX(jitter = 0): number {
  return -((WINNER_IDX * ITEM_STRIDE + ITEM_W / 2) - CONTAINER_W / 2 + jitter);
}

export function firstOfRarity(r: Rarity): ChestItem {
  return CHEST_ITEMS.find((i) => i.rarity === r) ?? CHEST_ITEMS[0];
}
