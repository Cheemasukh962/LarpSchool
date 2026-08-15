/**
 * What an equipped chest item does. Bonuses stay small on purpose: gear is a nudge, not a
 * rewrite of the LinkedIn rubric. Caps live here so stacking a full inventory cannot
 * turn a Davis student into Stanford+Stripe.
 */

export type GearKind = "flex" | "luck" | "payout";

export interface GearEffect {
  kind: GearKind;
  /** flex: extra fight points. luck: rarity tilt 0-100. payout: extra percent on slot wins. */
  value: number;
}

export interface GearBonus {
  flex: number;
  luck: number;
  payout: number;
}

export const FLEX_CAP = 8;
export const LUCK_CAP = 20;
export const PAYOUT_CAP = 100;
/** How many items of the same kind (flex / luck / payout) can be on at once. */
export const EQUIP_PER_KIND = 2;

export const ZERO_GEAR: GearBonus = { flex: 0, luck: 0, payout: 0 };

export function effectLabel(effect?: GearEffect | null): string {
  if (!effect) return "";
  if (effect.kind === "flex") return `FLEX +${effect.value}`;
  if (effect.kind === "luck") return `LUCK +${effect.value}`;
  return `PAYOUT +${effect.value}%`;
}

export function sumGear(items: Array<{ equipped?: boolean; effect?: GearEffect | null }>): GearBonus {
  const raw = items
    .filter((i) => i.equipped === true && i.effect)
    .reduce(
      (acc, i) => {
        if (i.effect?.kind === "flex") acc.flex += i.effect.value;
        if (i.effect?.kind === "luck") acc.luck += i.effect.value;
        if (i.effect?.kind === "payout") acc.payout += i.effect.value;
        return acc;
      },
      { ...ZERO_GEAR }
    );
  return {
    flex: Math.min(FLEX_CAP, raw.flex),
    luck: Math.min(LUCK_CAP, raw.luck),
    payout: Math.min(PAYOUT_CAP, raw.payout),
  };
}

/** Slot cash-out multiplier. 25 payout → 1.25x. Jackpots are the pot and stay unscaled. */
export function payoutMultiplier(payout: number): number {
  return 1 + Math.min(PAYOUT_CAP, Math.max(0, payout)) / 100;
}

export function equippedOfKind<T extends { equipped?: boolean; effect: GearEffect }>(
  items: T[],
  kind: GearKind
): number {
  return items.filter((i) => i.equipped === true && i.effect?.kind === kind).length;
}

/** Keep the first EQUIP_PER_KIND of each kind; unequip the rest. */
export function clampEquipped<T extends { equipped: boolean; effect: GearEffect }>(items: T[]): T[] {
  const used: Record<GearKind, number> = { flex: 0, luck: 0, payout: 0 };
  return items.map((item) => {
    if (!item.equipped || !item.effect) return item;
    if (used[item.effect.kind] >= EQUIP_PER_KIND) return { ...item, equipped: false };
    used[item.effect.kind] += 1;
    return item;
  });
}

export function applyEquip<T extends { uid: string; equipped: boolean; effect: GearEffect }>(
  items: T[],
  uid: string,
  equipped: boolean
): T[] {
  const target = items.find((i) => i.uid === uid);
  if (!target || !target.effect) return items;
  if (target.equipped === equipped) return items;
  if (!equipped) {
    return items.map((i) => (i.uid === uid ? { ...i, equipped: false } : i));
  }
  if (equippedOfKind(items, target.effect.kind) >= EQUIP_PER_KIND) return items;
  return items.map((i) => (i.uid === uid ? { ...i, equipped: true } : i));
}

export function toggleEquipped<T extends { uid: string; equipped: boolean; effect: GearEffect }>(
  items: T[],
  uid: string
): T[] {
  const target = items.find((i) => i.uid === uid);
  if (!target) return items;
  return applyEquip(items, uid, !target.equipped);
}
