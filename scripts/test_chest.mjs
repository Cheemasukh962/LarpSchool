/**
 * Chest odds and junk-vs-chase power. If commons start winning fights, this should fail.
 *
 * Run: node scripts/test_chest.mjs
 */
import assert from "node:assert/strict";

import { CHEST_ITEMS, PREVIEW_REEL, WINNER_IDX, buildReel, rarityShare } from "../lib/chest.ts";

const common = rarityShare("common");
const uncommon = rarityShare("uncommon");
const rare = rarityShare("rare");
const epic = rarityShare("epic");
const legendary = rarityShare("legendary");

assert.ok(common >= 0.7, `common should be most chests, got ${(common * 100).toFixed(1)}%`);
assert.ok(uncommon >= 0.2, `uncommon should be the usual "real" drop, got ${(uncommon * 100).toFixed(1)}%`);
assert.ok(rare + epic + legendary <= 0.06, `rare+ should stay scarce, got ${((rare + epic + legendary) * 100).toFixed(1)}%`);
assert.ok(legendary <= 0.002, `legendary should be ~1 in 1000, got ${(legendary * 100).toFixed(2)}%`);
assert.ok(rarityShare("legendary", 20) <= 0.004, "max luck must not make legendary common");

for (const item of CHEST_ITEMS) {
  if (item.rarity === "common") {
    assert.ok(item.effect.value <= 0, `${item.name} is common but still has a bonus`);
  }
  if (item.rarity === "uncommon") {
    if (item.effect.kind === "payout") assert.ok(item.effect.value <= 5, `${item.name} payout is too strong`);
    else assert.ok(item.effect.value <= 1, `${item.name} uncommon bonus is too strong`);
  }
}

assert.ok(
  CHEST_ITEMS.some((i) => i.rarity === "legendary" && i.effect.kind === "payout"),
  "legendary table is missing a payout chase item"
);

const junk = CHEST_ITEMS.find((i) => i.rarity === "common");
const reel = buildReel(junk);
assert.equal(reel[WINNER_IDX].id, junk.id, "the reel must park on the real drop, not a tease tile");
const chase = reel.filter((i) => i.rarity === "epic" || i.rarity === "legendary");
assert.ok(chase.length >= 8, `reel should flash chase items, saw ${chase.length}`);
assert.ok(["epic", "legendary"].includes(reel[WINNER_IDX - 1].rarity), "left of the pointer should be a near-miss");
assert.ok(["epic", "legendary"].includes(reel[WINNER_IDX + 1].rarity), "right of the pointer should be a near-miss");
assert.ok(
  PREVIEW_REEL.some((i) => i.rarity === "legendary") && PREVIEW_REEL.some((i) => i.rarity === "epic"),
  "idle reel should already show gold and pink"
);

console.log(
  `test_chest: ok — common ${(common * 100).toFixed(0)}% / uncommon ${(uncommon * 100).toFixed(0)}% / rare ${(rare * 100).toFixed(1)}% / epic ${(epic * 100).toFixed(1)}% / legendary ${(legendary * 100).toFixed(1)}%`
);
