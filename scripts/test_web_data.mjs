/**
 * Smoke test for the static payloads and the pure helpers the UI depends on.
 *
 * Guards the things a typecheck cannot see: that the four bars add up to the flex score
 * the card displays next to them, that every photo a card claims actually exists, and that
 * search and matchmaking return sane results on the real roster.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { resolveBattle } from "../lib/battle.ts";
import { rankedOpponents, searchCards, suggestedOpponents } from "../lib/cards.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p), "utf8"));

const { cards, count } = read("public/data/cards.json");
const { questions, count: qCount } = read("public/data/questions.json");

/* ── cards ── */
assert.equal(cards.length, count, "cards.count disagrees with the array length");
assert.ok(cards.length > 700, `expected the full roster, got ${cards.length}`);

const BAR_MAX = { school: 32, work: 32, presence: 26, projects: 10 };
const ids = new Set();
let missingPhotos = 0;

for (const c of cards) {
  assert.ok(!ids.has(c.id), `duplicate card id ${c.id}`);
  ids.add(c.id);

  assert.ok(c.name?.trim(), `card ${c.id} has no name`);
  assert.ok(c.initials?.trim(), `card ${c.id} has no initials`);

  const sum = c.breakdown.school + c.breakdown.work + c.breakdown.presence + c.breakdown.projects;
  assert.equal(sum, c.flex_score, `${c.name}: bars sum to ${sum} but flex_score is ${c.flex_score}`);

  for (const [key, max] of Object.entries(BAR_MAX)) {
    const pts = c.breakdown[key];
    assert.ok(pts >= 0 && pts <= max, `${c.name}: ${key} is ${pts}, outside 0..${max}`);
  }

  assert.ok(c.compliment?.trim(), `${c.name} has no compliment`);
  assert.ok(c.roast?.trim(), `${c.name} has no roast`);

  if (c.has_photo && !existsSync(path.join(ROOT, "public", "photos", `${c.id}.webp`))) missingPhotos++;
}
assert.equal(missingPhotos, 0, `${missingPhotos} cards claim a photo that is not on disk`);

const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);
assert.equal(ranks[0], 1, "no rank 1");
assert.ok(
  cards.every((c) => {
    const better = cards.filter((o) => o.flex_score > c.flex_score).length;
    return c.rank > better;
  }),
  "rank disagrees with flex_score ordering"
);

/* ── questions ── */
assert.equal(questions.length, qCount, "questions.count disagrees with the array length");
for (const q of questions) {
  assert.ok(q.options.length >= 2, `${q.id} has ${q.options.length} options`);
  assert.ok(q.correct >= 0 && q.correct < q.options.length, `${q.id} correct index out of range`);
  assert.ok(new Set(q.options).size === q.options.length, `${q.id} has duplicate options`);
  assert.ok(/^#[0-9a-f]{6}$/i.test(q.color), `${q.id} color ${q.color} is not a hex triplet`);
}

/* ── search ── */
const target = cards[0];
const firstName = target.name.split(" ")[0];
const hits = searchCards(cards, firstName, 25);
assert.ok(
  hits.some((c) => c.id === target.id),
  `searching "${firstName}" did not return ${target.name}`
);
assert.equal(searchCards(cards, "   ").length, 0, "blank search should return nothing");
assert.equal(searchCards(cards, "zzzzzzqqq").length, 0, "nonsense search should return nothing");

const exact = searchCards(cards, target.name, 5);
assert.equal(exact[0].id, target.id, "an exact full-name search should rank that person first");

/* ── matchmaking ── */
const ranked = rankedOpponents(cards, target);
assert.equal(ranked.length, cards.length - 1, "ranked roster should be everyone except the player");
assert.ok(!ranked.some((c) => c.id === target.id), "ranked roster included the player");
const rankedGaps = ranked.map((c) => Math.abs(c.flex_score - target.flex_score));
assert.deepEqual(rankedGaps, [...rankedGaps].sort((a, b) => a - b), "ranked roster is not ordered by score gap");

const opponents = suggestedOpponents(cards, target, 12);
assert.equal(opponents.length, 12);
assert.equal(new Set(opponents.map((c) => c.id)).size, 12, "matchmaking returned the same person twice");
assert.ok(!opponents.some((c) => c.id === target.id), "matchmaking offered the player themselves");

const gaps = opponents.map((c) => Math.abs(c.flex_score - target.flex_score));
assert.deepEqual(gaps, [...gaps].sort((a, b) => a - b), "matchmaking is not ordered by score gap");

const smallestGap = Math.min(...cards.filter((c) => c.id !== target.id).map((c) => Math.abs(c.flex_score - target.flex_score)));
assert.equal(gaps[0], smallestGap, "the first suggestion is not the closest opponent");
assert.ok(new Set(gaps).size > 1, `matchmaking served ${gaps.length} opponents all at gap ${gaps[0]}`);

// count === 1 used to divide by zero while spreading the sample across the pool.
assert.equal(suggestedOpponents(cards, target, 1).length, 1, "asking for one opponent returned nothing");
for (const n of [1, 2, 3, 5, 40]) {
  const picked = suggestedOpponents(cards, target, n);
  assert.equal(picked.length, n, `asked for ${n} opponents, got ${picked.length}`);
  assert.ok(picked.every(Boolean), `asking for ${n} opponents produced a hole`);
}

/* ── battles ── */
const byRank = [...cards].sort((a, b) => a.rank - b.rank);
const top = byRank[0];
const bottom = byRank[byRank.length - 1];
const blowout = resolveBattle(top, bottom);
assert.equal(blowout.winner_id, top.id, "the top-ranked card lost to the bottom-ranked card");
assert.equal(blowout.photo_finish, false, "a blowout should not be flagged as a photo finish");

const mirrored = resolveBattle(bottom, top);
assert.equal(mirrored.winner_id, blowout.winner_id, "battle result depends on argument order");
assert.equal(mirrored.verdict, blowout.verdict, "verdict depends on argument order");

const close = cards.find((c) => c.id !== top.id && Math.abs(c.flex_score - top.flex_score) < 5);
if (close) {
  const photo = resolveBattle(top, close);
  assert.equal(photo.photo_finish, true, "a sub-5 margin should be flagged as a photo finish");
}

for (const c of cards.slice(0, 50)) {
  const r = resolveBattle(c, suggestedOpponents(cards, c, 1)[0]);
  assert.ok(r.verdict?.trim(), `${c.name} produced an empty verdict`);
  assert.ok(r.winner_score >= r.loser_score, `${c.name}: winner scored below the loser`);
}

console.log(
  `WEB DATA OK - ${cards.length} cards, ${questions.length} questions, ` +
    `${cards.filter((c) => c.has_photo).length} photos verified on disk`
);
