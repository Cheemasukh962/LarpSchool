/**
 * Loot chest table and reel geometry, lifted out of the mock component.
 *
 * Loot table + reel geometry. Server picks the winner when Supabase is on; this file
 * still builds the reel so the animation can park on that item.
 */

import type { GearEffect } from "./gear";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface ChestItem {
  id: number;
  name: string;
  icon: string;
  rarity: Rarity;
  border: string;
  bg: string;
  glow: string;
  effect: GearEffect;
}

export interface OwnedItem extends ChestItem {
  uid: string;
  equipped: boolean;
}

export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary"];

export const CHEST_ITEMS: ChestItem[] = [
  { id: 1, name: "PEASANT SCROLL", icon: "📜", rarity: "common", border: "#666", bg: "#111", glow: "#66666633", effect: { kind: "luck", value: 0 } },
  { id: 2, name: "WOODEN SWORD", icon: "🗡️", rarity: "common", border: "#666", bg: "#111", glow: "#66666633", effect: { kind: "flex", value: 0 } },
  { id: 3, name: "LEATHER CAP", icon: "🪖", rarity: "common", border: "#666", bg: "#111", glow: "#66666633", effect: { kind: "flex", value: 0 } },
  { id: 4, name: "TAVERN COIN", icon: "🪙", rarity: "common", border: "#666", bg: "#111", glow: "#66666633", effect: { kind: "payout", value: 0 } },
  { id: 5, name: "ROPE & HOOK", icon: "🪝", rarity: "common", border: "#666", bg: "#111", glow: "#66666633", effect: { kind: "luck", value: 0 } },
  { id: 17, name: "RUSTY NAIL", icon: "📌", rarity: "common", border: "#666", bg: "#111", glow: "#66666633", effect: { kind: "flex", value: 0 } },
  { id: 18, name: "MOLDY CRUST", icon: "🍞", rarity: "common", border: "#666", bg: "#111", glow: "#66666633", effect: { kind: "luck", value: 0 } },
  { id: 19, name: "CRACKED MUG", icon: "🍺", rarity: "common", border: "#666", bg: "#111", glow: "#66666633", effect: { kind: "payout", value: 0 } },
  { id: 6, name: "SILVER DAGGER", icon: "⚔️", rarity: "uncommon", border: "#4a9eff", bg: "#05111f", glow: "#4a9eff44", effect: { kind: "flex", value: 1 } },
  { id: 7, name: "MAGIC MAP", icon: "🗺️", rarity: "uncommon", border: "#4a9eff", bg: "#05111f", glow: "#4a9eff44", effect: { kind: "luck", value: 1 } },
  { id: 8, name: "ENCHANT WAND", icon: "🪄", rarity: "uncommon", border: "#4a9eff", bg: "#05111f", glow: "#4a9eff44", effect: { kind: "payout", value: 5 } },
  { id: 9, name: "SHADOW CLOAK", icon: "🦇", rarity: "rare", border: "#a855f7", bg: "#0e0518", glow: "#a855f755", effect: { kind: "luck", value: 3 } },
  { id: 10, name: "DRAGON EGG", icon: "🥚", rarity: "rare", border: "#a855f7", bg: "#0e0518", glow: "#a855f755", effect: { kind: "flex", value: 2 } },
  { id: 11, name: "ARCANE TOME", icon: "📕", rarity: "rare", border: "#a855f7", bg: "#0e0518", glow: "#a855f755", effect: { kind: "payout", value: 12 } },
  { id: 12, name: "VOID CRYSTAL", icon: "💎", rarity: "epic", border: "#ec4899", bg: "#1a0511", glow: "#ec489966", effect: { kind: "luck", value: 5 } },
  { id: 13, name: "PHOENIX PLUME", icon: "🔥", rarity: "epic", border: "#ec4899", bg: "#1a0511", glow: "#ec489966", effect: { kind: "flex", value: 3 } },
  { id: 14, name: "CHAOS SHARD", icon: "⚡", rarity: "epic", border: "#ec4899", bg: "#1a0511", glow: "#ec489966", effect: { kind: "payout", value: 22 } },
  { id: 15, name: "CROWN OF REALM", icon: "👑", rarity: "legendary", border: "#ffd700", bg: "#140d00", glow: "#ffd70077", effect: { kind: "flex", value: 5 } },
  { id: 16, name: "DRAGON HEART", icon: "❤️‍🔥", rarity: "legendary", border: "#ffd700", bg: "#140d00", glow: "#ffd70077", effect: { kind: "luck", value: 8 } },
  { id: 20, name: "GOLDEN GRAIL", icon: "🏆", rarity: "legendary", border: "#ffd700", bg: "#140d00", glow: "#ffd70077", effect: { kind: "payout", value: 40 } },
];

/** Out of 1000. Rare+ is ~5% so a booth night sees a few purples, almost no gold. */
export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 720,
  uncommon: 230,
  rare: 42,
  epic: 7,
  legendary: 1,
};

/* Reel geometry. The winner is always parked at WINNER_IDX; the stop offset is measured from the DOM. */
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

/** Luck can sweeten a roll a little. It cannot turn the table into a rare farm. */
export function rarityWeights(luck = 0): Record<Rarity, number> {
  const tilt = Math.max(0, Math.min(20, luck));
  return {
    common: Math.max(500, RARITY_WEIGHTS.common - tilt * 8),
    uncommon: RARITY_WEIGHTS.uncommon,
    rare: RARITY_WEIGHTS.rare + Math.floor(tilt * 0.4),
    epic: RARITY_WEIGHTS.epic + Math.floor(tilt * 0.15),
    legendary: RARITY_WEIGHTS.legendary + (tilt >= 16 ? 1 : 0),
  };
}

export function rarityShare(rarity: Rarity, luck = 0): number {
  const weights = rarityWeights(luck);
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  return weights[rarity] / total;
}

function pickByWeights(weights: Record<Rarity, number>): ChestItem {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const rarity of RARITY_ORDER) {
    r -= weights[rarity];
    if (r <= 0) return sampleRarity(rarity);
  }
  return CHEST_ITEMS[0];
}

export function weightedChestItem(luck = 0): ChestItem {
  return pickByWeights(rarityWeights(luck));
}

/**
 * What flies past the pointer. Heavier on pink/gold than the real table so a common
 * drop still feels like it almost hit. Does not change what the server awards.
 */
export const REEL_SHOW_WEIGHTS: Record<Rarity, number> = {
  common: 22,
  uncommon: 18,
  rare: 22,
  epic: 22,
  legendary: 16,
};

function teaseItem(prefer: Rarity): ChestItem {
  return sampleRarity(Math.random() < 0.6 ? prefer : prefer === "legendary" ? "epic" : "legendary");
}

export function firstOfRarity(r: Rarity): ChestItem {
  return CHEST_ITEMS.find((i) => i.rarity === r) ?? CHEST_ITEMS[0];
}

/** Idle strip so the chest screen already shows crowns before the first open. */
export const PREVIEW_REEL: ChestItem[] = [
  firstOfRarity("legendary"),
  firstOfRarity("epic"),
  firstOfRarity("rare"),
  firstOfRarity("uncommon"),
  firstOfRarity("legendary"),
  firstOfRarity("epic"),
  firstOfRarity("common"),
  firstOfRarity("rare"),
  firstOfRarity("epic"),
  firstOfRarity("legendary"),
];

export function buildReel(winner: ChestItem): ChestItem[] {
  const arr = Array.from({ length: REEL_LEN }, () => pickByWeights(REEL_SHOW_WEIGHTS));
  arr[WINNER_IDX] = winner;

  // Near-miss: the tiles that sit under the pointer after it stops.
  arr[WINNER_IDX - 1] = teaseItem("legendary");
  if (WINNER_IDX + 1 < REEL_LEN) arr[WINNER_IDX + 1] = teaseItem("epic");

  // Approach tiles during the slowdown — gold and pink in the last beats.
  for (const [idx, rarity] of [
    [WINNER_IDX - 8, "epic"],
    [WINNER_IDX - 5, "legendary"],
    [WINNER_IDX - 3, "epic"],
    [WINNER_IDX - 2, "legendary"],
  ] as const) {
    if (idx >= 0 && idx !== WINNER_IDX) arr[idx] = sampleRarity(rarity);
  }

  return arr;
}

/** Pixel offset that parks WINNER_IDX under the center of a viewport this wide. No extra padding. */
export function finalTranslateX(containerW = CONTAINER_W, jitter = 0): number {
  const winnerCenter = WINNER_IDX * ITEM_STRIDE + ITEM_W / 2;
  return containerW / 2 - winnerCenter - jitter;
}

/**
 * TranslateX that puts the winner tile under the pointer. Reads the laid-out tiles so
 * padding, gap, and the real phone width cannot drift from the math.
 * Call while the reel's transform is identity.
 */
export function reelStopX(reel: HTMLElement, winnerIdx = WINNER_IDX): number {
  const viewport = reel.parentElement;
  const tile = reel.children[winnerIdx] as HTMLElement | undefined;
  if (!viewport || !tile) {
    return finalTranslateX(viewport?.clientWidth ?? CONTAINER_W);
  }
  const view = viewport.getBoundingClientRect();
  const box = tile.getBoundingClientRect();
  const marker = view.left + view.width / 2;
  const center = box.left + box.width / 2;
  return marker - center;
}
