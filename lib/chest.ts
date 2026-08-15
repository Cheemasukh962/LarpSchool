/**
 * Loot chest table and reel geometry, lifted out of the mock component.
 *
 * Loot table + reel geometry. Server picks the winner when Supabase is on; this file
 * still builds the reel so the animation can park on that item.
 */

import { type GearEffect } from "./gear";

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
  { id: 1, name: "PEASANT SCROLL", icon: "📜", rarity: "common", border: "#666", bg: "#111", glow: "#66666633", effect: { kind: "luck", value: 1 } },
  { id: 2, name: "WOODEN SWORD", icon: "🗡️", rarity: "common", border: "#666", bg: "#111", glow: "#66666633", effect: { kind: "flex", value: 1 } },
  { id: 3, name: "LEATHER CAP", icon: "🪖", rarity: "common", border: "#666", bg: "#111", glow: "#66666633", effect: { kind: "flex", value: 1 } },
  { id: 4, name: "TAVERN COIN", icon: "🪙", rarity: "common", border: "#666", bg: "#111", glow: "#66666633", effect: { kind: "payout", value: 10 } },
  { id: 5, name: "ROPE & HOOK", icon: "🪝", rarity: "common", border: "#666", bg: "#111", glow: "#66666633", effect: { kind: "luck", value: 1 } },
  { id: 6, name: "SILVER DAGGER", icon: "⚔️", rarity: "uncommon", border: "#4a9eff", bg: "#05111f", glow: "#4a9eff44", effect: { kind: "flex", value: 2 } },
  { id: 7, name: "MAGIC MAP", icon: "🗺️", rarity: "uncommon", border: "#4a9eff", bg: "#05111f", glow: "#4a9eff44", effect: { kind: "luck", value: 3 } },
  { id: 8, name: "ENCHANT WAND", icon: "🪄", rarity: "uncommon", border: "#4a9eff", bg: "#05111f", glow: "#4a9eff44", effect: { kind: "payout", value: 15 } },
  { id: 9, name: "SHADOW CLOAK", icon: "🦇", rarity: "rare", border: "#a855f7", bg: "#0e0518", glow: "#a855f755", effect: { kind: "luck", value: 5 } },
  { id: 10, name: "DRAGON EGG", icon: "🥚", rarity: "rare", border: "#a855f7", bg: "#0e0518", glow: "#a855f755", effect: { kind: "flex", value: 3 } },
  { id: 11, name: "ARCANE TOME", icon: "📕", rarity: "rare", border: "#a855f7", bg: "#0e0518", glow: "#a855f755", effect: { kind: "payout", value: 25 } },
  { id: 12, name: "VOID CRYSTAL", icon: "💎", rarity: "epic", border: "#ec4899", bg: "#1a0511", glow: "#ec489966", effect: { kind: "luck", value: 8 } },
  { id: 13, name: "PHOENIX PLUME", icon: "🔥", rarity: "epic", border: "#ec4899", bg: "#1a0511", glow: "#ec489966", effect: { kind: "flex", value: 4 } },
  { id: 14, name: "CHAOS SHARD", icon: "⚡", rarity: "epic", border: "#ec4899", bg: "#1a0511", glow: "#ec489966", effect: { kind: "payout", value: 40 } },
  { id: 15, name: "CROWN OF REALM", icon: "👑", rarity: "legendary", border: "#ffd700", bg: "#140d00", glow: "#ffd70077", effect: { kind: "flex", value: 5 } },
  { id: 16, name: "DRAGON HEART", icon: "❤️‍🔥", rarity: "legendary", border: "#ffd700", bg: "#140d00", glow: "#ffd70077", effect: { kind: "luck", value: 10 } },
];

export const RARITY_WEIGHTS: Record<Rarity, number> = {
  common: 50,
  uncommon: 28,
  rare: 14,
  epic: 6,
  legendary: 2,
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

export function weightedChestItem(luck = 0): ChestItem {
  const tilt = Math.max(0, Math.min(20, luck));
  const weights: Record<Rarity, number> = {
    common: Math.max(8, RARITY_WEIGHTS.common - tilt * 1.4),
    uncommon: RARITY_WEIGHTS.uncommon,
    rare: RARITY_WEIGHTS.rare + tilt * 0.5,
    epic: RARITY_WEIGHTS.epic + tilt * 0.5,
    legendary: RARITY_WEIGHTS.legendary + tilt * 0.4,
  };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const rarity of RARITY_ORDER) {
    r -= weights[rarity];
    if (r <= 0) return sampleRarity(rarity);
  }
  return CHEST_ITEMS[0];
}

export function buildReel(winner: ChestItem, luck = 0): ChestItem[] {
  const arr = Array.from({ length: REEL_LEN }, () => weightedChestItem(luck));
  arr[WINNER_IDX] = winner;
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

export function firstOfRarity(r: Rarity): ChestItem {
  return CHEST_ITEMS.find((i) => i.rarity === r) ?? CHEST_ITEMS[0];
}
