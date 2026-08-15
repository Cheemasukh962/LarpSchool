/**
 * Equip rules. If tapping an item in Store does nothing, this file should fail first.
 *
 * Run: node scripts/test_gear.mjs
 */
import assert from "node:assert/strict";

import {
  EQUIP_PER_KIND,
  applyEquip,
  clampEquipped,
  effectLabel,
  equippedOfKind,
  sumGear,
  toggleEquipped,
} from "../lib/gear.ts";

function item(uid, kind, value, equipped) {
  return { uid, equipped, effect: { kind, value } };
}

/* sumGear must ignore anything that is not explicitly equipped. */
assert.deepEqual(sumGear([item("a", "flex", 3, false)]), { flex: 0, luck: 0, payout: 0 });
assert.deepEqual(sumGear([item("a", "flex", 3, true)]), { flex: 3, luck: 0, payout: 0 });
assert.equal(sumGear([{ uid: "ghost", effect: { kind: "flex", value: 9 } }]).flex, 0, "missing equipped must not count");

/* toggle on / off */
const one = [item("sword", "flex", 1, false)];
const on = toggleEquipped(one, "sword");
assert.equal(on[0].equipped, true);
assert.equal(toggleEquipped(on, "sword")[0].equipped, false);
assert.deepEqual(toggleEquipped(one, "nope"), one);

/* cap: 2 of the same kind */
const flexes = [
  item("f1", "flex", 1, true),
  item("f2", "flex", 1, true),
  item("f3", "flex", 1, false),
];
assert.equal(equippedOfKind(flexes, "flex"), 2);
assert.equal(toggleEquipped(flexes, "f3")[2].equipped, false, "third flex must stay off");
assert.equal(toggleEquipped(flexes, "f1")[0].equipped, false, "unequip still works at cap");

/* different kinds do not block each other */
const mixed = [item("f1", "flex", 1, true), item("f2", "flex", 1, true), item("l1", "luck", 1, false)];
assert.equal(toggleEquipped(mixed, "l1")[2].equipped, true);

/* applyEquip sets the requested flag; it does not blindly toggle */
const off = [item("hat", "flex", 1, false)];
assert.equal(applyEquip(off, "hat", true)[0].equipped, true);
assert.equal(applyEquip(off, "hat", false)[0].equipped, false);
assert.equal(applyEquip(flexes, "f3", true)[2].equipped, false, "applyEquip respects the cap");
assert.equal(applyEquip(flexes, "f1", false)[0].equipped, false);

/* clamp drops extras, keeps the first two */
const piled = clampEquipped([
  item("a", "flex", 1, true),
  item("b", "flex", 1, true),
  item("c", "flex", 1, true),
]);
assert.deepEqual(
  piled.map((i) => i.equipped),
  [true, true, false]
);
assert.equal(EQUIP_PER_KIND, 2);

/* labels must not throw on junk from an old inventory row */
assert.equal(effectLabel({ kind: "flex", value: 2 }), "FLEX +2");
assert.equal(effectLabel(undefined), "");
assert.equal(effectLabel(null), "");

console.log("test_gear: ok");
